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


def _digest_html(alerts: list[Alert]) -> str:
    import html

    from app.core.config import settings
    from app.services.email import render_email

    rows = []
    for a in alerts[:20]:
        rows.append(
            '<div style="padding:12px 0;border-top:1px solid #eceff0;">'
            f'<div style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;'
            f'color:#13b886;font-weight:bold;">{html.escape(a.kind.replace("_", " "))}</div>'
            f'<div style="font-weight:bold;color:#0e1817;margin-top:2px;">{html.escape(a.title)}</div>'
            f'<div style="color:#637270;font-size:13px;margin-top:2px;">{html.escape(a.message)}</div>'
            "</div>"
        )
    return render_email(
        heading="Your research updates",
        intro="Here's what's new for the topics you monitor:",
        cta_text="View in dashboard",
        cta_url=f"{settings.FRONTEND_ORIGIN}/dashboard",
        body_html="".join(rows),
    )


async def send_digests() -> dict:
    """Email each user a digest of alerts not yet sent. Idempotent: alerts are
    marked `emailed` once delivered, so re-running won't re-send them."""
    from app.db.models import User
    from app.services.email import email_enabled, send_email

    if not email_enabled():
        return {"sent": 0, "skipped": "email_not_configured"}

    async with AsyncSessionLocal() as db:
        pending = (
            await db.execute(
                select(Alert)
                .where(Alert.emailed == False)  # noqa: E712
                .order_by(Alert.user_id, Alert.created_at.desc())
            )
        ).scalars().all()

        by_user: dict[str, list[Alert]] = {}
        for a in pending:
            by_user.setdefault(a.user_id, []).append(a)

        sent = 0
        for user_id, user_alerts in by_user.items():
            user = await db.get(User, user_id)
            if not user or not user.email:
                continue
            ok = await send_email(
                user.email,
                f"{len(user_alerts)} new research updates for you",
                _digest_html(user_alerts),
            )
            if ok:
                for a in user_alerts:
                    a.emailed = True
                sent += 1
        await db.commit()
        return {"sent": sent, "users_with_updates": len(by_user)}
