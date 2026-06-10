"""Automated monitoring.

For each user subscription, re-runs discovery and creates Alert rows for items
that look new (heuristic: not seen before by title). In production this runs on
a Celery beat schedule; here it can be triggered via an API endpoint or a simple
asyncio background loop.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents import discovery
from app.db.database import AsyncSessionLocal
from app.db.models import Alert, Subscription


async def _seen_titles(db: AsyncSession, user_id: str, kind: str) -> set[str]:
    rows = (
        await db.execute(
            select(Alert.title).where(Alert.user_id == user_id, Alert.kind == kind)
        )
    ).scalars().all()
    return {t.lower() for t in rows}


async def check_subscription(db: AsyncSession, sub: Subscription) -> int:
    created = 0
    topic = sub.topic

    if sub.watch_papers:
        seen = await _seen_titles(db, sub.user_id, "new_paper")
        for p in (await discovery.paper_discovery_agent(topic, 8))[:8]:
            if p.title.lower() in seen:
                continue
            db.add(Alert(
                user_id=sub.user_id, kind="new_paper", title=p.title,
                message=f"New paper for '{topic}' ({p.venue or '?'}, {p.year or '?'})",
                payload=p.model_dump(),
            ))
            created += 1

    if sub.watch_grants:
        seen = await _seen_titles(db, sub.user_id, "new_grant")
        for g in (await discovery.grant_agent(topic, "", 5)):
            if g.title.lower() in seen:
                continue
            db.add(Alert(
                user_id=sub.user_id, kind="new_grant", title=g.title,
                message=f"Funding opportunity ({g.agency}) — deadline {g.deadline}",
                payload=g.model_dump(),
            ))
            created += 1

    if sub.watch_datasets:
        seen = await _seen_titles(db, sub.user_id, "new_dataset")
        for d in (await discovery.dataset_discovery_agent(topic, 5))[:5]:
            if d.name.lower() in seen:
                continue
            db.add(Alert(
                user_id=sub.user_id, kind="new_dataset", title=d.name,
                message=f"New dataset for '{topic}' on {d.source}",
                payload=d.model_dump(),
            ))
            created += 1

    if sub.watch_cfps:
        seen = await _seen_titles(db, sub.user_id, "cfp")
        for c in (await discovery.conference_agent(topic, 4)):
            if c.name.lower() in seen:
                continue
            db.add(Alert(
                user_id=sub.user_id, kind="cfp", title=c.name,
                message=f"CFP: {c.acronym} — submit by {c.submission_deadline}",
                payload=c.model_dump(),
            ))
            created += 1

    sub.last_checked = datetime.utcnow()
    await db.commit()
    return created


async def run_all_subscriptions() -> dict:
    """Iterate every subscription and generate alerts. Returns a summary."""
    async with AsyncSessionLocal() as db:
        subs = (await db.execute(select(Subscription))).scalars().all()
        total = 0
        for sub in subs:
            try:
                total += await check_subscription(db, sub)
            except Exception:
                continue
        return {"subscriptions_checked": len(subs), "alerts_created": total}
