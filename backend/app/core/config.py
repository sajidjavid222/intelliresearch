"""Application configuration loaded from environment variables.

All settings have sensible defaults so the app boots with zero configuration.
Provide real keys in a `.env` file to unlock paid/authenticated integrations.
"""
from functools import lru_cache
from typing import Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def _normalize_db_url(cls, v: str) -> str:
        """Managed Postgres (Render/Railway/Heroku) hands out `postgres://` or
        `postgresql://` URLs, but our async engine needs the asyncpg driver.
        Rewrite the scheme so the provided connection string just works."""
        if not isinstance(v, str):
            return v
        if v.startswith("postgres://"):
            v = "postgresql+asyncpg://" + v[len("postgres://"):]
        elif v.startswith("postgresql://"):
            v = "postgresql+asyncpg://" + v[len("postgresql://"):]
        # asyncpg doesn't accept libpq's ?sslmode= query param; strip it.
        if "+asyncpg" in v and "sslmode=" in v:
            import re
            v = re.sub(r"[?&]sslmode=[^&]+", "", v)
        return v

    # --- App ---
    APP_NAME: str = "IntelliResearch"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    # Password for the /admin analytics page. If unset, /admin is disabled.
    ADMIN_TOKEN: Optional[str] = None

    # --- Database ---
    # Defaults to local SQLite. For production set a Postgres URL, e.g.:
    # postgresql+asyncpg://user:pass@localhost:5432/researchpilot
    DATABASE_URL: str = "sqlite+aiosqlite:///./researchpilot.db"

    # --- LLM providers (optional) ---
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    LLM_PROVIDER: str = "auto"  # auto | openai | anthropic | gemini | none
    OPENAI_MODEL: str = "gpt-4o-mini"
    ANTHROPIC_MODEL: str = "claude-haiku-4-5-20251001"
    # 3.1-flash-lite has the highest free-tier daily quota (500 RPD vs 20).
    GEMINI_MODEL: str = "gemini-3.1-flash-lite"

    # --- External data sources (optional keys) ---
    SEMANTIC_SCHOLAR_API_KEY: Optional[str] = None
    GITHUB_TOKEN: Optional[str] = None
    HUGGINGFACE_TOKEN: Optional[str] = None

    # --- Google Scholar (via `scholarly`; best-effort, often blocked) ---
    SCHOLAR_ENABLED: bool = True
    SCHOLAR_TIMEOUT_SECONDS: float = 12.0
    SCHOLAR_USE_PROXY: bool = False  # free proxies: slow, may dodge some blocks
    CORE_API_KEY: Optional[str] = None  # core.ac.uk

    # --- Auth (Google OAuth, optional) ---
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None

    # --- Infra (optional) ---
    REDIS_URL: str = "redis://localhost:6379/0"
    QDRANT_URL: Optional[str] = None

    # --- Caching of outbound source API calls ---
    CACHE_ENABLED: bool = True
    # Default TTL (seconds) for cached upstream responses. Search results don't
    # change minute-to-minute, so a few minutes is a big win with low staleness.
    CACHE_TTL_SECONDS: int = 600

    # --- CORS ---
    FRONTEND_ORIGIN: str = "http://localhost:3000"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
