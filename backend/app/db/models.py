"""Database models for users, saved items, alerts, subscriptions, history."""
import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String, default="")
    hashed_password: Mapped[str | None] = mapped_column(String, nullable=True)
    google_id: Mapped[str | None] = mapped_column(String, nullable=True)
    # Free-text research profile used for grant/collaborator matching.
    research_interests: Mapped[str] = mapped_column(Text, default="")
    affiliation: Mapped[str] = mapped_column(String, default="")
    # Extended profile.
    role: Mapped[str] = mapped_column(String, default="")  # e.g. PhD Student, Professor
    institution: Mapped[str] = mapped_column(String, default="")
    department: Mapped[str] = mapped_column(String, default="")
    country: Mapped[str] = mapped_column(String, default="")
    bio: Mapped[str] = mapped_column(Text, default="")
    orcid: Mapped[str] = mapped_column(String, default="")
    google_scholar: Mapped[str] = mapped_column(String, default="")
    website: Mapped[str] = mapped_column(String, default="")
    github: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    saved_items: Mapped[list["SavedItem"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    projects: Mapped[list["Project"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    searches: Mapped[list["SavedSearch"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    subscriptions: Mapped[list["Subscription"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    alerts: Mapped[list["Alert"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Collection(Base):
    """A user-defined folder for organizing saved items (e.g. a project)."""

    __tablename__ = "collections"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text, default="")
    color: Mapped[str] = mapped_column(String, default="brand")  # color theme key
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    items: Mapped[list["SavedItem"]] = relationship(back_populates="collection")


class SavedItem(Base):
    """A saved paper / dataset / grant / conference / patent / repo."""

    __tablename__ = "saved_items"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    item_type: Mapped[str] = mapped_column(String, index=True)  # paper|dataset|grant|...
    title: Mapped[str] = mapped_column(String)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    notes: Mapped[str] = mapped_column(Text, default="")
    collection_id: Mapped[str | None] = mapped_column(
        ForeignKey("collections.id"), nullable=True, index=True
    )
    # Optional: file this item under a research Project workspace.
    project_id: Mapped[str | None] = mapped_column(
        ForeignKey("projects.id"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped[User] = relationship(back_populates="saved_items")
    collection: Mapped["Collection | None"] = relationship(back_populates="items")
    project: Mapped["Project | None"] = relationship(back_populates="items")


class Project(Base):
    """A research project workspace: groups saved items, tasks, and notes."""

    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text, default="")
    color: Mapped[str] = mapped_column(String, default="brand")  # color theme key
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    user: Mapped[User] = relationship(back_populates="projects")
    items: Mapped[list["SavedItem"]] = relationship(back_populates="project")
    tasks: Mapped[list["ProjectTask"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )


class ProjectTask(Base):
    """A to-do item inside a project, optionally with a due date."""

    __tablename__ = "project_tasks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String)
    done: Mapped[bool] = mapped_column(Boolean, default=False)
    due_date: Mapped[str | None] = mapped_column(String, nullable=True)  # ISO yyyy-mm-dd
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project: Mapped[Project] = relationship(back_populates="tasks")


class SavedSearch(Base):
    __tablename__ = "saved_searches"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    query: Mapped[str] = mapped_column(String)
    agents: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped[User] = relationship(back_populates="searches")


class Subscription(Base):
    """A monitored topic. Background workers re-run discovery for these."""

    __tablename__ = "subscriptions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    topic: Mapped[str] = mapped_column(String)
    watch_papers: Mapped[bool] = mapped_column(Boolean, default=True)
    watch_grants: Mapped[bool] = mapped_column(Boolean, default=True)
    watch_datasets: Mapped[bool] = mapped_column(Boolean, default=True)
    watch_cfps: Mapped[bool] = mapped_column(Boolean, default=True)
    last_checked: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped[User] = relationship(back_populates="subscriptions")


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    kind: Mapped[str] = mapped_column(String)  # new_paper|new_grant|new_dataset|cfp
    title: Mapped[str] = mapped_column(String)
    message: Mapped[str] = mapped_column(Text, default="")
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped[User] = relationship(back_populates="alerts")


class ReadingHistory(Base):
    __tablename__ = "reading_history"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    item_type: Mapped[str] = mapped_column(String)
    title: Mapped[str] = mapped_column(String)
    url: Mapped[str] = mapped_column(String, default="")
    viewed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
