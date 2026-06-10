"""Google Scholar author profiles via the `scholarly` library.

IMPORTANT: Google Scholar has no API and actively blocks automated access
(CAPTCHAs, IP bans). `scholarly` scrapes the public site, which works from some
residential IPs but is frequently blocked — especially from servers/datacenters.
So this is best-effort: it runs in a thread with a hard timeout, and any
failure returns None so the caller can fall back to OpenAlex.
"""
from __future__ import annotations

import asyncio
from typing import Optional

from app.core.config import settings


def _fetch_blocking(name: str) -> Optional[dict]:
    """Synchronous scholarly fetch. Runs inside a thread executor."""
    try:
        from scholarly import scholarly, ProxyGenerator
    except Exception:
        return None

    # Optionally route through free proxies (slow, unreliable, but can dodge
    # some blocks). Off by default to avoid long hangs.
    if settings.SCHOLAR_USE_PROXY:
        try:
            pg = ProxyGenerator()
            if pg.FreeProxies():
                scholarly.use_proxy(pg)
        except Exception:
            pass

    try:
        search = scholarly.search_author(name)
        author = next(search, None)
        if not author:
            return None  # blocked or genuinely no match
        filled = scholarly.fill(
            author, sections=["basics", "indices", "interests", "publications"]
        )
    except Exception:
        return None

    # Top publications by citation count.
    pubs = filled.get("publications") or []
    pubs_sorted = sorted(pubs, key=lambda p: p.get("num_citations", 0) or 0, reverse=True)
    papers = []
    for p in pubs_sorted[:12]:
        bib = p.get("bib") or {}
        year = bib.get("pub_year")
        papers.append({
            "title": bib.get("title", ""),
            "authors": [a.strip() for a in (bib.get("author", "") or "").split(" and ") if a.strip()][:6],
            "venue": bib.get("venue") or bib.get("journal"),
            "year": int(year) if year and str(year).isdigit() else None,
            "citation_count": p.get("num_citations"),
            "url": (
                f"https://scholar.google.com/citations?view_op=view_citation&hl=en&"
                f"user={filled.get('scholar_id','')}&citation_for_view={p.get('author_pub_id','')}"
            ) if p.get("author_pub_id") else None,
            "source": "Google Scholar",
        })

    # Yearly citation counts (scholarly gives cites_per_year as {year: count}).
    cpy = filled.get("cites_per_year") or {}
    counts_by_year = [{"year": int(y), "count": c} for y, c in sorted(cpy.items())]

    return {
        "name": filled.get("name"),
        "scholar_id": filled.get("scholar_id"),
        "scholar_url": (
            f"https://scholar.google.com/citations?user={filled.get('scholar_id')}"
            if filled.get("scholar_id") else None
        ),
        "affiliation": filled.get("affiliation"),
        "verified_email": filled.get("email_domain"),
        "h_index": filled.get("hindex"),
        "i10_index": filled.get("i10index"),
        "cited_by_count": filled.get("citedby"),
        "works_count": len(pubs) or None,
        "topics": filled.get("interests") or [],
        "counts_by_year": counts_by_year,  # NB: citations/year, not works/year
        "counts_label": "Citations per year",
        "papers": papers,
        "source": "Google Scholar",
    }


async def author_profile_scholar(name: str) -> Optional[dict]:
    """Best-effort Google Scholar lookup with a hard timeout."""
    if not settings.SCHOLAR_ENABLED:
        return None
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(_fetch_blocking, name),
            timeout=settings.SCHOLAR_TIMEOUT_SECONDS,
        )
    except (asyncio.TimeoutError, Exception):
        return None
