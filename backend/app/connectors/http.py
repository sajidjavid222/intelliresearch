"""Shared async HTTP helper with sane timeouts, a friendly User-Agent, and a
short-TTL response cache for GET requests.

Caching is transparent: every connector that calls `get_json` / `get_text`
benefits automatically. Identical upstream requests within the TTL window are
served from cache (Redis if available, else in-process), which protects the
public APIs from repeated hits and makes repeat searches near-instant.

Pass `cache_ttl=0` to bypass the cache for a specific call.
"""
import asyncio
from typing import Any, Optional

import httpx

from app.core.config import settings
from app.services.cache import get_cache, make_key

USER_AGENT = "IntelliResearch/1.0 (academic research assistant)"
TIMEOUT = httpx.Timeout(20.0, connect=10.0)
# LLM generation can take longer than a data-source lookup.
LLM_TIMEOUT = httpx.Timeout(90.0, connect=10.0)

# Sentinel so we can distinguish "use default TTL" from an explicit 0.
_DEFAULT = -1


def _ttl(cache_ttl: int) -> int:
    if not settings.CACHE_ENABLED:
        return 0
    return settings.CACHE_TTL_SECONDS if cache_ttl == _DEFAULT else cache_ttl


async def get_json(
    url: str,
    params: Optional[dict] = None,
    headers: Optional[dict] = None,
    cache_ttl: int = _DEFAULT,
) -> Any:
    ttl = _ttl(cache_ttl)
    # OpenAlex throttles the anonymous "common pool" hard from shared cloud IPs.
    # Passing a contact email moves us to the faster, reliable "polite pool".
    if "api.openalex.org" in url and settings.OPENALEX_MAILTO:
        params = {**(params or {}), "mailto": settings.OPENALEX_MAILTO}
    # Headers may carry API keys; include only their names in the cache key.
    key = make_key("get_json", url, params or {}, sorted((headers or {}).keys()))
    cache = get_cache()

    if ttl > 0:
        cached = await cache.get(key)
        if cached is not None:
            return cached

    is_openalex = "api.openalex.org" in url
    h = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    if is_openalex and settings.OPENALEX_MAILTO:
        # OpenAlex routes to the polite pool when the contact email is in the UA too.
        h["User-Agent"] = f"IntelliResearch/1.0 (mailto:{settings.OPENALEX_MAILTO})"
    if headers:
        h.update(headers)
    data = None
    for attempt in range(2 if is_openalex else 1):
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True) as c:
                r = await c.get(url, params=params, headers=h)
                r.raise_for_status()
                data = r.json()
            break
        except Exception:
            if is_openalex and attempt == 0:
                await asyncio.sleep(1.0)
                continue
            return None

    if ttl > 0 and data is not None:
        await cache.set(key, data, ttl)
    return data


async def post_json(
    url: str, json_body: dict, headers: Optional[dict] = None
) -> Any:
    # POST (used for LLM calls) is never cached — responses depend on the prompt.
    h = {"User-Agent": USER_AGENT, "Content-Type": "application/json"}
    if headers:
        h.update(headers)
    try:
        async with httpx.AsyncClient(timeout=LLM_TIMEOUT, follow_redirects=True) as c:
            r = await c.post(url, json=json_body, headers=h)
            r.raise_for_status()
            return r.json()
    except Exception:
        return None


async def get_text(
    url: str,
    params: Optional[dict] = None,
    headers: Optional[dict] = None,
    cache_ttl: int = _DEFAULT,
) -> Optional[str]:
    ttl = _ttl(cache_ttl)
    key = make_key("get_text", url, params or {}, sorted((headers or {}).keys()))
    cache = get_cache()

    if ttl > 0:
        cached = await cache.get(key)
        if cached is not None:
            return cached

    h = {"User-Agent": USER_AGENT}
    if headers:
        h.update(headers)
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True) as c:
            r = await c.get(url, params=params, headers=h)
            r.raise_for_status()
            text = r.text
    except Exception:
        return None

    if ttl > 0 and text is not None:
        await cache.set(key, text, ttl)
    return text
