"""Discovery extras: platform stats, trending topics, recommendations, and
publication-trend data for charts. These power the redesigned dashboard/home.
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from fastapi import HTTPException

from app.agents import discovery
from app.api.deps import get_optional_user
from app.connectors import collaborators as collab_conn
from app.connectors import papers as papers_conn
from app.connectors import scholar as scholar_conn
from app.connectors.http import get_json
from app.db.database import get_db
from app.db.models import Alert, SavedItem, Subscription, User
from app.services.cache import get_cache, make_key
from app.services.llm import get_llm

router = APIRouter(prefix="/discover", tags=["discover"])

# Languages offered by the multi-language UI (code → display name).
LANGUAGES = {
    "es": "Spanish", "fr": "French", "de": "German", "zh": "Chinese (Simplified)",
    "hi": "Hindi", "ar": "Arabic", "pt": "Portuguese", "ru": "Russian",
    "ja": "Japanese", "ko": "Korean", "it": "Italian", "bn": "Bengali",
    "ta": "Tamil", "te": "Telugu",
}


# Curated, evergreen trending research topics (shown on the home/empty state).
TRENDING = [
    {"topic": "Large Language Models", "tag": "NLP", "heat": 98},
    {"topic": "Retrieval-Augmented Generation", "tag": "NLP", "heat": 94},
    {"topic": "Diffusion Models", "tag": "Vision", "heat": 91},
    {"topic": "Edge AI", "tag": "Systems", "heat": 86},
    {"topic": "Federated Learning", "tag": "Privacy", "heat": 83},
    {"topic": "Graph Neural Networks", "tag": "ML", "heat": 80},
    {"topic": "Indoor Localization", "tag": "Sensing", "heat": 74},
    {"topic": "Explainable AI", "tag": "ML", "heat": 72},
    {"topic": "Reinforcement Learning from Human Feedback", "tag": "ML", "heat": 70},
    {"topic": "Multimodal Learning", "tag": "Vision", "heat": 69},
    {"topic": "Quantum Machine Learning", "tag": "Emerging", "heat": 61},
    {"topic": "Neuromorphic Computing", "tag": "Hardware", "heat": 58},
]


@router.get("/trending")
async def trending():
    return TRENDING


@router.get("/stats")
async def platform_stats(
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Headline numbers. Source counts are static; user counts are live."""
    out = {
        "sources": 12,
        "agents": 10,
        "papers_indexed": "200M+",
        "datasets": "500k+",
    }
    if user:
        saved = await db.scalar(
            select(func.count()).select_from(SavedItem).where(SavedItem.user_id == user.id)
        )
        subs = await db.scalar(
            select(func.count()).select_from(Subscription).where(Subscription.user_id == user.id)
        )
        unread = await db.scalar(
            select(func.count())
            .select_from(Alert)
            .where(Alert.user_id == user.id, Alert.read == False)  # noqa: E712
        )
        out["user"] = {"saved": saved or 0, "subscriptions": subs or 0, "unread_alerts": unread or 0}
    return out


@router.get("/recommendations")
async def recommendations(
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Personalized paper recommendations from the user's profile interests,
    or from their most-recent saved items, or a sensible default."""
    topic = "machine learning"
    if user and user.research_interests:
        topic = user.research_interests.split(",")[0].strip() or topic
    elif user:
        last = await db.scalar(
            select(SavedItem.title)
            .where(SavedItem.user_id == user.id)
            .order_by(SavedItem.created_at.desc())
        )
        if last:
            topic = last
    papers = await papers_conn.recommend_papers(topic, 8)
    return {"based_on": topic, "papers": papers}


@router.get("/trends")
async def publication_trends(q: str = Query(...)):
    """Yearly publication counts for a topic (for the trend chart).

    Queries all years concurrently so the whole call returns in ~1 request time.
    """
    import asyncio
    import datetime

    this_year = datetime.date.today().year
    years = list(range(this_year - 7, this_year + 1))

    async def count_for(y: int) -> dict:
        data = await get_json(
            "https://api.openalex.org/works",
            # OpenAlex rejects the top-level `search` param alongside `filter`;
            # put the query inside the filter via default.search instead.
            params={
                "filter": f"default.search:{q},publication_year:{y}",
                "per-page": 1,
            },
        )
        total = ((data or {}).get("meta") or {}).get("count", 0)
        return {"year": y, "count": total}

    counts = await asyncio.gather(*[count_for(y) for y in years])
    return {"topic": q, "series": list(counts)}


@router.get("/related")
async def related_papers(q: str, limit: int = 8):
    """Papers related to a topic — used by the 'similar papers' feature."""
    return await discovery.paper_discovery_agent(q, limit)


@router.get("/author")
async def author_profile(
    name: str = Query(""), author_id: str = Query("")
):
    """Full author profile: metrics, affiliation, topics, and top papers.

    - With `author_id`: fetch that EXACT OpenAlex author (the candidate picker
      uses this, so you always get the right person — no name collisions).
    - With `name` only: try Google Scholar first (often blocked from servers),
      then fall back to OpenAlex. The `source` field says which answered.
    """
    import asyncio

    # Exact pick by id — precise, OpenAlex only (GS can't be id-disambiguated).
    if author_id:
        profile = await collab_conn.author_profile(author_id=author_id)
        if profile:
            return profile
        raise HTTPException(404, f"No author found for id '{author_id}'")

    if not name:
        raise HTTPException(422, "Provide either 'name' or 'author_id'")

    # Run both concurrently so OpenAlex is ready immediately; prefer Google
    # Scholar only if it actually returns (it usually won't from a server).
    gs, profile = await asyncio.gather(
        scholar_conn.author_profile_scholar(name),
        collab_conn.author_profile(name=name),
        return_exceptions=True,
    )
    if isinstance(gs, dict) and gs.get("papers"):
        return gs
    if isinstance(profile, dict) and profile:
        return profile
    raise HTTPException(404, f"No author profile found for '{name}'")


@router.get("/author/candidates")
async def author_candidates(name: str = Query(...), limit: int = 6):
    """Multiple matching authors (OpenAlex) so the UI can disambiguate."""
    return await collab_conn.author_candidates(name, limit)


@router.get("/languages")
async def languages():
    """Languages available for on-demand translation."""
    return [{"code": c, "name": n} for c, n in LANGUAGES.items()]


class TranslateRequest(BaseModel):
    text: str
    target: str  # language code, e.g. "es"


@router.post("/translate")
async def translate(body: TranslateRequest):
    """Translate text into a target language via the LLM (cached)."""
    lang = LANGUAGES.get(body.target)
    if not lang:
        raise HTTPException(400, f"Unsupported language '{body.target}'")
    text = (body.text or "").strip()
    if not text:
        return {"translation": "", "target": body.target}

    llm = get_llm()
    if not llm.available:
        raise HTTPException(
            503, "Translation needs an LLM — set GEMINI_API_KEY in backend/.env."
        )

    # Cache: identical (text, target) pairs translate to the same result.
    cache = get_cache()
    key = make_key("translate", body.target, text)
    cached = await cache.get(key)
    if cached is not None:
        return {"translation": cached, "target": body.target, "cached": True}

    system = (
        f"You are a professional academic translator. Translate the user's text "
        f"into {lang}. Preserve technical terms, meaning, and academic tone. "
        f"Return ONLY the translation, no preamble."
    )
    out = (await llm.complete(text, system, max_tokens=1500)).strip()
    if out and "LLM not configured" not in out:
        await cache.set(key, out, ttl=86400)  # 24h
    return {"translation": out, "target": body.target}
