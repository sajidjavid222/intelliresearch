"""Research project workspaces: group saved items, tasks, and notes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.db.models import Project, ProjectTask, SavedItem, User
from app.schemas import (
    ProjectRequest,
    ProjectUpdateRequest,
    TaskRequest,
    TaskUpdateRequest,
)

router = APIRouter(prefix="/projects", tags=["projects"])


def _task_dict(t: ProjectTask) -> dict:
    return {
        "id": t.id, "title": t.title, "done": t.done,
        "due_date": t.due_date, "created_at": t.created_at,
    }


def _item_dict(i: SavedItem) -> dict:
    return {
        "id": i.id, "item_type": i.item_type, "title": i.title,
        "payload": i.payload, "notes": i.notes, "collection_id": i.collection_id,
    }


async def _owned_project(project_id: str, user: User, db: AsyncSession) -> Project:
    p = (
        await db.execute(
            select(Project).where(Project.id == project_id, Project.user_id == user.id)
        )
    ).scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Project not found")
    return p


# ---------- Projects ----------
@router.post("")
async def create_project(
    body: ProjectRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    p = Project(
        user_id=user.id, name=body.name.strip() or "Untitled project",
        description=body.description, color=body.color,
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return {"id": p.id}


@router.get("")
async def list_projects(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    projects = (
        await db.execute(
            select(Project)
            .where(Project.user_id == user.id)
            .order_by(Project.updated_at.desc())
        )
    ).scalars().all()

    # Item counts per project.
    item_counts = dict(
        (
            await db.execute(
                select(SavedItem.project_id, func.count())
                .where(SavedItem.user_id == user.id, SavedItem.project_id.isnot(None))
                .group_by(SavedItem.project_id)
            )
        ).all()
    )
    # Total + open task counts per project.
    total_tasks = dict(
        (
            await db.execute(
                select(ProjectTask.project_id, func.count())
                .where(ProjectTask.user_id == user.id)
                .group_by(ProjectTask.project_id)
            )
        ).all()
    )
    open_tasks = dict(
        (
            await db.execute(
                select(ProjectTask.project_id, func.count())
                .where(ProjectTask.user_id == user.id, ProjectTask.done == False)  # noqa: E712
                .group_by(ProjectTask.project_id)
            )
        ).all()
    )

    return [
        {
            "id": p.id, "name": p.name, "description": p.description,
            "color": p.color, "updated_at": p.updated_at,
            "item_count": item_counts.get(p.id, 0),
            "task_count": total_tasks.get(p.id, 0),
            "open_tasks": open_tasks.get(p.id, 0),
        }
        for p in projects
    ]


@router.get("/{project_id}")
async def get_project(
    project_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    p = await _owned_project(project_id, user, db)
    tasks = (
        await db.execute(
            select(ProjectTask)
            .where(ProjectTask.project_id == p.id)
            .order_by(ProjectTask.done, ProjectTask.created_at)
        )
    ).scalars().all()
    items = (
        await db.execute(
            select(SavedItem)
            .where(SavedItem.project_id == p.id, SavedItem.user_id == user.id)
            .order_by(SavedItem.created_at.desc())
        )
    ).scalars().all()
    return {
        "id": p.id, "name": p.name, "description": p.description,
        "color": p.color, "notes": p.notes,
        "created_at": p.created_at, "updated_at": p.updated_at,
        "tasks": [_task_dict(t) for t in tasks],
        "items": [_item_dict(i) for i in items],
    }


@router.patch("/{project_id}")
async def update_project(
    project_id: str,
    body: ProjectUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    p = await _owned_project(project_id, user, db)
    if body.name is not None:
        p.name = body.name.strip() or p.name
    if body.description is not None:
        p.description = body.description
    if body.color is not None:
        p.color = body.color
    if body.notes is not None:
        p.notes = body.notes[:20000]
    await db.commit()
    return {"ok": True}


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Detach saved items (they survive in the library), then delete the project
    # — tasks cascade away with it.
    await db.execute(
        SavedItem.__table__.update()
        .where(SavedItem.project_id == project_id, SavedItem.user_id == user.id)
        .values(project_id=None)
    )
    await db.execute(
        delete(Project).where(Project.id == project_id, Project.user_id == user.id)
    )
    await db.commit()
    return {"ok": True}


# ---------- Tasks ----------
@router.post("/{project_id}/tasks")
async def add_task(
    project_id: str,
    body: TaskRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _owned_project(project_id, user, db)
    title = body.title.strip()
    if not title:
        raise HTTPException(422, "Task title is required")
    t = ProjectTask(
        project_id=project_id, user_id=user.id, title=title[:300],
        due_date=(body.due_date or None),
    )
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return _task_dict(t)


@router.patch("/tasks/{task_id}")
async def update_task(
    task_id: str,
    body: TaskUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = (
        await db.execute(
            select(ProjectTask).where(
                ProjectTask.id == task_id, ProjectTask.user_id == user.id
            )
        )
    ).scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Task not found")
    if body.title is not None:
        t.title = body.title.strip()[:300] or t.title
    if body.done is not None:
        t.done = body.done
    if body.due_date is not None:
        t.due_date = body.due_date or None
    await db.commit()
    return _task_dict(t)


@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        delete(ProjectTask).where(
            ProjectTask.id == task_id, ProjectTask.user_id == user.id
        )
    )
    await db.commit()
    return {"ok": True}


# ---------- Item assignment ----------
@router.post("/{project_id}/items/{item_id}")
async def assign_item(
    project_id: str,
    item_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _owned_project(project_id, user, db)
    item = (
        await db.execute(
            select(SavedItem).where(SavedItem.id == item_id, SavedItem.user_id == user.id)
        )
    ).scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Item not found")
    item.project_id = project_id
    await db.commit()
    return {"ok": True}


@router.delete("/{project_id}/items/{item_id}")
async def unassign_item(
    project_id: str,
    item_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    item = (
        await db.execute(
            select(SavedItem).where(
                SavedItem.id == item_id,
                SavedItem.user_id == user.id,
                SavedItem.project_id == project_id,
            )
        )
    ).scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Item not found in this project")
    item.project_id = None
    await db.commit()
    return {"ok": True}
