"""Monitoring trigger + knowledge-graph endpoint for citation visualization."""
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException

from app.agents import discovery
from app.api.deps import get_current_user
from app.core.config import settings
from app.db.models import User
from app.services.monitoring import run_all_subscriptions, send_digests

router = APIRouter(prefix="/monitoring", tags=["monitoring"])


@router.post("/run")
async def trigger_monitoring(user: User = Depends(get_current_user)):
    """Manually trigger a monitoring pass (Celery beat does this on schedule)."""
    return await run_all_subscriptions()


@router.post("/digest")
async def run_digest(x_cron_token: Optional[str] = Header(default=None)):
    """Scheduled job: refresh monitored topics, then email each user a digest of
    new alerts. Guarded by a shared secret (CRON_TOKEN); called by a cron."""
    if not settings.CRON_TOKEN or x_cron_token != settings.CRON_TOKEN:
        raise HTTPException(403, "Forbidden")
    monitoring = await run_all_subscriptions()
    digest = await send_digests()
    return {"monitoring": monitoring, "digest": digest}


@router.get("/graph")
async def knowledge_graph(q: str, limit: int = 15):
    """Build a paper/author co-authorship graph for citation-network viz."""
    papers = await discovery.paper_discovery_agent(q, limit)
    nodes, links = [], []
    seen_authors: dict[str, str] = {}

    for i, p in enumerate(papers):
        pid = f"paper-{i}"
        nodes.append({
            "id": pid, "type": "paper", "label": p.title[:80],
            "citations": p.citation_count or 0, "year": p.year,
            "seminal": p.is_seminal, "url": p.url, "venue": p.venue,
        })
        for author in p.authors[:6]:
            if author not in seen_authors:
                aid = f"author-{len(seen_authors)}"
                seen_authors[author] = aid
                nodes.append({"id": aid, "type": "author", "label": author})
            links.append({"source": seen_authors[author], "target": pid})

    return {"nodes": nodes, "links": links}
