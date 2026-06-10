"""Admin analytics — usage stats behind a simple password (ADMIN_TOKEN).

The /admin page calls these with an `X-Admin-Token` header. If ADMIN_TOKEN is
not configured, the endpoints return 503 so nothing is exposed by accident.
"""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.database import get_db
from app.db.models import (
    Alert,
    Collection,
    ReadingHistory,
    SavedItem,
    Subscription,
    User,
)

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin(token: Optional[str]) -> None:
    if not settings.ADMIN_TOKEN:
        raise HTTPException(503, "Admin analytics not configured (set ADMIN_TOKEN).")
    if token != settings.ADMIN_TOKEN:
        raise HTTPException(401, "Invalid admin password.")


async def _count(db: AsyncSession, model, *conds) -> int:
    stmt = select(func.count()).select_from(model)
    for c in conds:
        stmt = stmt.where(c)
    return (await db.scalar(stmt)) or 0


@router.get("/check")
async def check(x_admin_token: Optional[str] = Header(None)):
    """Lightweight password check (used by the login gate)."""
    _require_admin(x_admin_token)
    return {"ok": True}


@router.get("/stats")
async def stats(
    x_admin_token: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(x_admin_token)

    now = datetime.utcnow()
    today = datetime(now.year, now.month, now.day)  # midnight UTC
    week = now - timedelta(days=7)

    SEARCH = ReadingHistory.item_type == "search"

    # Recent signups
    recent_users = (
        await db.execute(
            select(User.email, User.name, User.created_at)
            .order_by(User.created_at.desc())
            .limit(10)
        )
    ).all()

    # Recent searches
    recent_searches = (
        await db.execute(
            select(ReadingHistory.title, ReadingHistory.viewed_at)
            .where(SEARCH)
            .order_by(ReadingHistory.viewed_at.desc())
            .limit(15)
        )
    ).all()

    # Top searched topics
    top_topics = (
        await db.execute(
            select(ReadingHistory.title, func.count().label("n"))
            .where(SEARCH)
            .group_by(ReadingHistory.title)
            .order_by(func.count().desc())
            .limit(10)
        )
    ).all()

    # Signups per day (last 14 days) for a mini chart
    signup_rows = (
        await db.execute(
            select(User.created_at).where(User.created_at >= now - timedelta(days=14))
        )
    ).scalars().all()
    by_day: dict[str, int] = {}
    for ts in signup_rows:
        key = ts.strftime("%Y-%m-%d")
        by_day[key] = by_day.get(key, 0) + 1
    signups_series = [{"day": k, "count": v} for k, v in sorted(by_day.items())]

    return {
        "users": {
            "total": await _count(db, User),
            "today": await _count(db, User, User.created_at >= today),
            "this_week": await _count(db, User, User.created_at >= week),
        },
        "searches": {
            "total": await _count(db, ReadingHistory, SEARCH),
            "today": await _count(db, ReadingHistory, SEARCH, ReadingHistory.viewed_at >= today),
            "this_week": await _count(db, ReadingHistory, SEARCH, ReadingHistory.viewed_at >= week),
        },
        "engagement": {
            "saved_items": await _count(db, SavedItem),
            "collections": await _count(db, Collection),
            "subscriptions": await _count(db, Subscription),
            "alerts": await _count(db, Alert),
        },
        "recent_signups": [
            {"email": e, "name": n, "created_at": c.isoformat() if c else None}
            for e, n, c in recent_users
        ],
        "recent_searches": [
            {"query": t, "at": v.isoformat() if v else None}
            for t, v in recent_searches
        ],
        "top_topics": [{"topic": t, "count": n} for t, n in top_topics],
        "signups_series": signups_series,
        "generated_at": now.isoformat(),
    }
