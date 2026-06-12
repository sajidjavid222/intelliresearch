"""Dashboard: saved items, saved searches, subscriptions, alerts, history."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.db.models import (
    Alert,
    Collection,
    ReadingHistory,
    SavedItem,
    SavedSearch,
    Subscription,
    User,
)
from app.schemas import (
    AlertOut,
    CollectionRequest,
    MoveItemRequest,
    SaveItemRequest,
    SubscriptionRequest,
)
from sqlalchemy import func

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


# ---------- Collections ----------
@router.post("/collections")
async def create_collection(
    body: CollectionRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    c = Collection(
        user_id=user.id, name=body.name, description=body.description, color=body.color
    )
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return {"id": c.id}


@router.get("/collections")
async def list_collections(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    cols = (
        await db.execute(
            select(Collection)
            .where(Collection.user_id == user.id)
            .order_by(Collection.created_at.desc())
        )
    ).scalars().all()
    # Item counts per collection.
    counts = dict(
        (
            await db.execute(
                select(SavedItem.collection_id, func.count())
                .where(SavedItem.user_id == user.id)
                .group_by(SavedItem.collection_id)
            )
        ).all()
    )
    return [
        {
            "id": c.id, "name": c.name, "description": c.description,
            "color": c.color, "count": counts.get(c.id, 0),
        }
        for c in cols
    ]


@router.patch("/collections/{collection_id}")
async def update_collection(
    collection_id: str,
    body: CollectionRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    c = (
        await db.execute(
            select(Collection).where(
                Collection.id == collection_id, Collection.user_id == user.id
            )
        )
    ).scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Collection not found")
    c.name, c.description, c.color = body.name, body.description, body.color
    await db.commit()
    return {"ok": True}


@router.delete("/collections/{collection_id}")
async def delete_collection(
    collection_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Unassign items, then delete the collection (items themselves survive).
    await db.execute(
        SavedItem.__table__.update()
        .where(SavedItem.collection_id == collection_id, SavedItem.user_id == user.id)
        .values(collection_id=None)
    )
    await db.execute(
        delete(Collection).where(
            Collection.id == collection_id, Collection.user_id == user.id
        )
    )
    await db.commit()
    return {"ok": True}


# ---------- Saved items ----------
@router.post("/items")
async def save_item(
    body: SaveItemRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    item = SavedItem(
        user_id=user.id, item_type=body.item_type, title=body.title,
        payload=body.payload, collection_id=body.collection_id,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return {"id": item.id}


@router.get("/items")
async def list_items(
    item_type: str | None = None,
    collection_id: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(SavedItem).where(SavedItem.user_id == user.id)
    if item_type:
        stmt = stmt.where(SavedItem.item_type == item_type)
    if collection_id:
        stmt = stmt.where(SavedItem.collection_id == collection_id)
    rows = (await db.execute(stmt.order_by(SavedItem.created_at.desc()))).scalars().all()
    return [
        {
            "id": r.id, "item_type": r.item_type, "title": r.title,
            "payload": r.payload, "collection_id": r.collection_id,
            "project_id": r.project_id, "notes": r.notes,
        }
        for r in rows
    ]


@router.post("/items/{item_id}/move")
async def move_item(
    item_id: str,
    body: MoveItemRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    item = (
        await db.execute(
            select(SavedItem).where(
                SavedItem.id == item_id, SavedItem.user_id == user.id
            )
        )
    ).scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Item not found")
    item.collection_id = body.collection_id
    await db.commit()
    return {"ok": True}


@router.post("/items/{item_id}/note")
async def update_note(
    item_id: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    item = (
        await db.execute(
            select(SavedItem).where(
                SavedItem.id == item_id, SavedItem.user_id == user.id
            )
        )
    ).scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Item not found")
    item.notes = str(body.get("notes", ""))[:5000]
    await db.commit()
    return {"ok": True}


@router.delete("/items/{item_id}")
async def delete_item(
    item_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        delete(SavedItem).where(SavedItem.id == item_id, SavedItem.user_id == user.id)
    )
    await db.commit()
    return {"ok": True}


# ---------- Saved searches ----------
@router.post("/searches")
async def save_search(
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    s = SavedSearch(user_id=user.id, query=body.get("query", ""), agents=body.get("agents", []))
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return {"id": s.id}


@router.get("/searches")
async def list_searches(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    rows = (
        await db.execute(
            select(SavedSearch)
            .where(SavedSearch.user_id == user.id)
            .order_by(SavedSearch.created_at.desc())
        )
    ).scalars().all()
    return [{"id": r.id, "query": r.query, "agents": r.agents} for r in rows]


# ---------- Subscriptions (automated monitoring) ----------
@router.post("/subscriptions")
async def subscribe(
    body: SubscriptionRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sub = Subscription(
        user_id=user.id, topic=body.topic, watch_papers=body.watch_papers,
        watch_grants=body.watch_grants, watch_datasets=body.watch_datasets,
        watch_cfps=body.watch_cfps,
    )
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    return {"id": sub.id}


@router.get("/subscriptions")
async def list_subscriptions(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    rows = (
        await db.execute(select(Subscription).where(Subscription.user_id == user.id))
    ).scalars().all()
    return [
        {
            "id": r.id, "topic": r.topic, "watch_papers": r.watch_papers,
            "watch_grants": r.watch_grants, "watch_datasets": r.watch_datasets,
            "watch_cfps": r.watch_cfps, "last_checked": r.last_checked,
        }
        for r in rows
    ]


@router.delete("/subscriptions/{sub_id}")
async def unsubscribe(
    sub_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        delete(Subscription).where(
            Subscription.id == sub_id, Subscription.user_id == user.id
        )
    )
    await db.commit()
    return {"ok": True}


# ---------- Alerts ----------
@router.get("/alerts", response_model=list[AlertOut])
async def list_alerts(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    rows = (
        await db.execute(
            select(Alert).where(Alert.user_id == user.id).order_by(Alert.created_at.desc())
        )
    ).scalars().all()
    return rows


@router.post("/alerts/{alert_id}/read")
async def mark_alert_read(
    alert_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    alert = (
        await db.execute(
            select(Alert).where(Alert.id == alert_id, Alert.user_id == user.id)
        )
    ).scalar_one_or_none()
    if not alert:
        raise HTTPException(404, "Alert not found")
    alert.read = True
    await db.commit()
    return {"ok": True}


# ---------- Reading history ----------
@router.get("/history")
async def history(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    rows = (
        await db.execute(
            select(ReadingHistory)
            .where(ReadingHistory.user_id == user.id)
            .order_by(ReadingHistory.viewed_at.desc())
            .limit(50)
        )
    ).scalars().all()
    return [
        {"item_type": r.item_type, "title": r.title, "url": r.url, "viewed_at": r.viewed_at}
        for r in rows
    ]
