"""IntelliResearch FastAPI application entrypoint."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    admin,
    auth,
    dashboard,
    discover,
    export,
    monitoring,
    pdf,
    projects,
    search,
)
from app.core.config import settings
from app.db.database import init_db
from app.services.cache import get_cache
from app.services.llm import get_llm


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="IntelliResearch API",
    description="Multi-agent autonomous research assistant.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(monitoring.router, prefix="/api")
app.include_router(discover.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(pdf.router, prefix="/api")
app.include_router(admin.router, prefix="/api")


@app.get("/api/health")
async def health():
    llm = get_llm()
    cache = get_cache()
    # Touch the cache so it resolves its backend (redis vs memory) on first call.
    await cache.get("rp:healthcheck")
    model = None
    if llm.provider == "gemini":
        model = settings.GEMINI_MODEL
    elif llm.provider == "openai":
        model = settings.OPENAI_MODEL
    elif llm.provider == "anthropic":
        model = settings.ANTHROPIC_MODEL
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "llm_provider": llm.provider,
        "llm_model": model,
        "llm_available": llm.available,
        "cache_enabled": settings.CACHE_ENABLED,
        "cache_backend": cache.backend,
        "cache_ttl_seconds": settings.CACHE_TTL_SECONDS,
    }


@app.post("/api/admin/cache/clear")
async def clear_cache():
    """Flush all cached upstream responses (e.g. to force-refresh results)."""
    await get_cache().clear()
    return {"status": "cleared"}


@app.get("/")
async def root():
    return {
        "name": "IntelliResearch",
        "docs": "/docs",
        "agents": [
            "paper_discovery", "literature_review", "dataset_discovery",
            "grant_discovery", "conference", "code_implementation",
            "patent_intelligence", "research_gap", "proposal_writing",
            "collaboration",
        ],
    }
