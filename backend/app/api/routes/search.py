"""Search & individual agent endpoints."""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents import analysis, discovery, rag
from app.agents.orchestrator import run_search
from app.api.deps import get_optional_user
from app.db.database import get_db
from app.db.models import ReadingHistory, User
from app.schemas import (
    ChatRequest,
    ChatResponse,
    LiteratureReview,
    Proposal,
    SearchRequest,
    SearchResponse,
)

router = APIRouter(prefix="/search", tags=["search"])


@router.post("", response_model=SearchResponse)
async def semantic_search(
    body: SearchRequest,
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Natural-language search. Orchestrator auto-selects agents from intent."""
    profile = user.research_interests if user else ""
    resp = await run_search(body, profile=profile)
    if user:
        db.add(
            ReadingHistory(
                user_id=user.id, item_type="search", title=body.query
            )
        )
        await db.commit()
    return resp


# ---- Direct single-agent endpoints (useful for the dashboard tabs) ----
@router.get("/papers")
async def papers(q: str, limit: int = 15):
    return await discovery.paper_discovery_agent(q, limit)


@router.get("/datasets")
async def datasets(q: str, limit: int = 12):
    return await discovery.dataset_discovery_agent(q, limit)


@router.get("/code")
async def code(q: str, limit: int = 12):
    return await discovery.code_discovery_agent(q, limit)


@router.get("/patents")
async def patents(q: str, limit: int = 10):
    return await discovery.patent_agent(q, limit)


@router.get("/conferences")
async def conferences(q: str, limit: int = 10):
    return await discovery.conference_agent(q, limit)


@router.get("/grants")
async def grants(
    q: str,
    limit: int = 12,
    user: Optional[User] = Depends(get_optional_user),
):
    profile = user.research_interests if user else ""
    return await discovery.grant_agent(q, profile, limit)


@router.get("/collaborators")
async def collaborators(q: str, limit: int = 10):
    return await discovery.collaboration_agent(q, limit)


@router.post("/literature-review", response_model=LiteratureReview)
async def literature_review(body: SearchRequest):
    papers = await discovery.paper_discovery_agent(body.query, body.limit)
    return await analysis.literature_review_agent(body.query, papers)


@router.post("/research-gaps")
async def research_gaps(body: SearchRequest):
    papers = await discovery.paper_discovery_agent(body.query, body.limit)
    return await analysis.research_gap_agent(body.query, papers)


@router.post("/proposal", response_model=Proposal)
async def proposal(
    topic: str = Query(...),
    user: Optional[User] = Depends(get_optional_user),
):
    profile = user.research_interests if user else ""
    papers = await discovery.paper_discovery_agent(topic, 8)
    return await analysis.proposal_agent(topic, papers, profile)


@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest):
    """RAG: answer a question grounded in the topic's papers, with citations.

    The client may pass the already-fetched `papers` to avoid a re-search; if
    omitted, discovery runs for `topic` (or the question itself).
    """
    result = await rag.chat_with_papers(body.question, body.topic, body.papers)
    return ChatResponse(**result)
