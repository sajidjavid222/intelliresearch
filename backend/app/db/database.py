"""Async SQLAlchemy engine, session factory, and Base."""
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False, future=True)
AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session


async def init_db() -> None:
    """Create tables. Import models so they register on Base.metadata."""
    from app.db import models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_add_missing_columns)


# Lightweight additive migration: create_all won't add columns to existing
# tables, so we ALTER in any missing ones. (For real production, use Alembic;
# this keeps the zero-config SQLite path working.)
_MIGRATIONS: dict[str, dict[str, str]] = {
    "users": {
        "role": "VARCHAR DEFAULT ''",
        "institution": "VARCHAR DEFAULT ''",
        "department": "VARCHAR DEFAULT ''",
        "country": "VARCHAR DEFAULT ''",
        "bio": "TEXT DEFAULT ''",
        "orcid": "VARCHAR DEFAULT ''",
        "google_scholar": "VARCHAR DEFAULT ''",
        "website": "VARCHAR DEFAULT ''",
        "github": "VARCHAR DEFAULT ''",
    },
    "saved_items": {
        "collection_id": "VARCHAR",
        "notes": "TEXT DEFAULT ''",
        "project_id": "VARCHAR",
    },
}


def _add_missing_columns(sync_conn) -> None:
    from sqlalchemy import inspect, text

    inspector = inspect(sync_conn)
    tables = set(inspector.get_table_names())
    for table, cols in _MIGRATIONS.items():
        if table not in tables:
            continue
        existing = {c["name"] for c in inspector.get_columns(table)}
        for col, ddl in cols.items():
            if col not in existing:
                sync_conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {ddl}"))
