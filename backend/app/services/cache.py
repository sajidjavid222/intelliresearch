"""Short-TTL response cache for outbound API calls.

Backends, in priority order:
  1. Redis  — used when `redis` is installed AND REDIS_URL is reachable.
  2. In-memory LRU+TTL — automatic fallback so the app works with zero infra.

The cache stores JSON-serialisable values keyed by a hash of the request. It is
deliberately conservative: any backend error degrades to "cache miss" so a
caching problem never breaks a request.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import time
from collections import OrderedDict
from typing import Any, Optional

from app.core.config import settings


def make_key(prefix: str, *parts: Any) -> str:
    raw = prefix + "|" + "|".join(json.dumps(p, sort_keys=True, default=str) for p in parts)
    digest = hashlib.sha256(raw.encode()).hexdigest()[:32]
    return f"rp:{prefix}:{digest}"


class _MemoryCache:
    """Tiny async-safe in-process TTL cache with an LRU cap."""

    def __init__(self, max_entries: int = 5000) -> None:
        self._store: "OrderedDict[str, tuple[float, str]]" = OrderedDict()
        self._max = max_entries
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[str]:
        async with self._lock:
            item = self._store.get(key)
            if not item:
                return None
            expires_at, value = item
            if expires_at < time.time():
                self._store.pop(key, None)
                return None
            self._store.move_to_end(key)  # mark as recently used
            return value

    async def set(self, key: str, value: str, ttl: int) -> None:
        async with self._lock:
            self._store[key] = (time.time() + ttl, value)
            self._store.move_to_end(key)
            while len(self._store) > self._max:
                self._store.popitem(last=False)  # evict least-recently-used

    async def clear(self) -> None:
        async with self._lock:
            self._store.clear()


class Cache:
    def __init__(self) -> None:
        self._redis = None
        self._memory = _MemoryCache()
        self._backend = "memory"
        self._init_attempted = False

    async def _ensure_redis(self) -> None:
        if self._init_attempted:
            return
        self._init_attempted = True
        try:
            import redis.asyncio as aioredis  # type: ignore

            client = aioredis.from_url(
                settings.REDIS_URL, encoding="utf-8", decode_responses=True
            )
            await client.ping()  # fail fast if unreachable
            self._redis = client
            self._backend = "redis"
        except Exception:
            self._redis = None
            self._backend = "memory"

    @property
    def backend(self) -> str:
        return self._backend

    async def get(self, key: str) -> Optional[Any]:
        await self._ensure_redis()
        try:
            raw: Optional[str]
            if self._redis is not None:
                raw = await self._redis.get(key)
            else:
                raw = await self._memory.get(key)
            return json.loads(raw) if raw is not None else None
        except Exception:
            return None

    async def set(self, key: str, value: Any, ttl: int) -> None:
        await self._ensure_redis()
        try:
            raw = json.dumps(value, default=str)
            if self._redis is not None:
                await self._redis.set(key, raw, ex=ttl)
            else:
                await self._memory.set(key, raw, ttl)
        except Exception:
            pass  # caching must never break the request path

    async def clear(self) -> None:
        await self._ensure_redis()
        try:
            if self._redis is not None:
                async for k in self._redis.scan_iter("rp:*"):
                    await self._redis.delete(k)
            else:
                await self._memory.clear()
        except Exception:
            pass


_cache: Optional[Cache] = None


def get_cache() -> Cache:
    global _cache
    if _cache is None:
        _cache = Cache()
    return _cache
