"""Additional paper source connectors: CORE, PubMed, DOAJ, DBLP.

All are free and work key-free (CORE works key-free at low limits; set
CORE_API_KEY for higher throughput). Each degrades to [] on any error.
"""
from __future__ import annotations

import html

from app.connectors.http import get_json
from app.core.config import settings
from app.schemas import Paper


# ---------------- CORE (open-access aggregator, 300M+ works) ----------------
async def search_core(query: str, limit: int = 10) -> list[Paper]:
    """CORE is reliable with a free key (set CORE_API_KEY); key-free it is rate-
    limited and can be slow, so we cap it with a short budget and skip on timeout.
    """
    import asyncio

    url = "https://api.core.ac.uk/v3/search/works"
    headers = {}
    if settings.CORE_API_KEY:
        headers["Authorization"] = f"Bearer {settings.CORE_API_KEY}"
    try:
        data = await asyncio.wait_for(
            get_json(url, params={"q": query, "limit": limit}, headers=headers),
            timeout=8.0,
        )
    except (asyncio.TimeoutError, Exception):
        return []
    if not data or "results" not in data:
        return []
    out: list[Paper] = []
    for w in data["results"]:
        authors = [a.get("name", "") for a in (w.get("authors") or [])]
        year = w.get("yearPublished")
        out.append(
            Paper(
                title=(w.get("title") or "").strip(),
                authors=[a for a in authors if a][:8],
                venue=w.get("publisher"),
                year=int(year) if year else None,
                doi=w.get("doi"),
                abstract=w.get("abstract"),
                url=w.get("downloadUrl") or w.get("sourceFulltextUrls", [None])[0],
                pdf_url=w.get("downloadUrl"),
                citation_count=w.get("citationCount"),
                source="CORE",
            )
        )
    return out


# ---------------- PubMed (biomedical / life sciences) ----------------
async def search_pubmed(query: str, limit: int = 10) -> list[Paper]:
    base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
    search = await get_json(
        f"{base}/esearch.fcgi",
        params={"db": "pubmed", "term": query, "retmax": limit, "retmode": "json"},
    )
    ids = (((search or {}).get("esearchresult") or {}).get("idlist")) or []
    if not ids:
        return []
    summary = await get_json(
        f"{base}/esummary.fcgi",
        params={"db": "pubmed", "id": ",".join(ids), "retmode": "json"},
    )
    result = (summary or {}).get("result") or {}
    out: list[Paper] = []
    for pid in result.get("uids", []):
        item = result.get(pid) or {}
        authors = [a.get("name", "") for a in (item.get("authors") or [])]
        year = None
        pubdate = item.get("pubdate", "")
        if pubdate[:4].isdigit():
            year = int(pubdate[:4])
        doi = next(
            (a.get("value") for a in (item.get("articleids") or []) if a.get("idtype") == "doi"),
            None,
        )
        out.append(
            Paper(
                title=(item.get("title") or "").strip(),
                authors=[a for a in authors if a][:8],
                venue=item.get("fulljournalname") or item.get("source"),
                year=year,
                doi=doi,
                url=f"https://pubmed.ncbi.nlm.nih.gov/{pid}/",
                source="PubMed",
            )
        )
    return out


# ---------------- DOAJ (Directory of Open Access Journals) ----------------
async def search_doaj(query: str, limit: int = 10) -> list[Paper]:
    from urllib.parse import quote

    url = f"https://doaj.org/api/search/articles/{quote(query)}"
    data = await get_json(url, params={"pageSize": limit})
    if not data or "results" not in data:
        return []
    out: list[Paper] = []
    for r in data["results"]:
        b = r.get("bibjson") or {}
        authors = [a.get("name", "") for a in (b.get("author") or [])]
        doi = next(
            (i.get("id") for i in (b.get("identifier") or []) if i.get("type") == "doi"),
            None,
        )
        link = next((l.get("url") for l in (b.get("link") or []) if l.get("url")), None)
        journal = (b.get("journal") or {}).get("title")
        year = None
        if str(b.get("year", "")).isdigit():
            year = int(b["year"])
        out.append(
            Paper(
                title=(b.get("title") or "").strip(),
                authors=[a for a in authors if a][:8],
                venue=journal,
                year=year,
                doi=doi,
                abstract=b.get("abstract"),
                url=link or (f"https://doi.org/{doi}" if doi else None),
                source="DOAJ",
            )
        )
    return out


# ---------------- DBLP (computer science bibliography) ----------------
async def search_dblp(query: str, limit: int = 10) -> list[Paper]:
    url = "https://dblp.org/search/publ/api"
    data = await get_json(url, params={"q": query, "format": "json", "h": limit})
    hits = (((data or {}).get("result") or {}).get("hits") or {}).get("hit")
    if not hits:
        return []
    out: list[Paper] = []
    for h in hits:
        info = h.get("info") or {}
        authors_field = (info.get("authors") or {}).get("author")
        authors: list[str] = []
        if isinstance(authors_field, list):
            authors = [a.get("text", "") if isinstance(a, dict) else str(a) for a in authors_field]
        elif isinstance(authors_field, dict):
            authors = [authors_field.get("text", "")]
        year = info.get("year")
        out.append(
            Paper(
                title=html.unescape((info.get("title") or "").strip().rstrip(".")),
                authors=[html.unescape(a) for a in authors if a][:8],
                venue=info.get("venue"),
                year=int(year) if year and str(year).isdigit() else None,
                doi=info.get("doi"),
                url=info.get("ee") or info.get("url"),
                source="DBLP",
            )
        )
    return out
