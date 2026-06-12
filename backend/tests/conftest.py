"""Test config: point the app at a throwaway SQLite DB before it's imported."""
import os

# Must be set BEFORE importing the app (the engine binds to it at import time).
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_ci.db"
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("CACHE_ENABLED", "false")

# Start each run from a clean schema.
try:
    os.remove("test_ci.db")
except FileNotFoundError:
    pass

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="session")
def client():
    # Using TestClient as a context manager runs the app lifespan (init_db).
    with TestClient(app) as c:
        yield c
