"""Paper source connectors.

Live, key-free sources used: arXiv, Semantic Scholar (Graph API), OpenAlex,
Crossref. These cover (or proxy) the major requested publishers — Semantic
Scholar and OpenAlex index IEEE, ACM, Springer, Elsevier, Nature and more.
"""
from __future__ import annotations

import feedparser

from app.connectors.http import get_json, get_text
from app.core.config import settings
from app.schemas import Paper


async def search_arxiv(query: str, limit: int = 10) -> list[Paper]:
    url = "http://export.arxiv.org/api/query"
    params = {
        "search_query": f"all:{query}",
        "start": 0,
        "max_results": limit,
        "sortBy": "relevance",
        "sortOrder": "descending",
    }
    text = await get_text(url, params=params)
    if not text:
        return []
    feed = feedparser.parse(text)
    papers: list[Paper] = []
    for e in feed.entries:
        year = None
        if getattr(e, "published", None):
            year = int(e.published[:4])
        pdf = next(
            (l.href for l in getattr(e, "links", []) if l.get("type") == "application/pdf"),
            None,
        )
        papers.append(
            Paper(
                title=e.title.replace("\n", " ").strip(),
                authors=[a.name for a in getattr(e, "authors", [])],
                venue="arXiv",
                year=year,
                abstract=getattr(e, "summary", "").replace("\n", " ").strip(),
                url=getattr(e, "link", None),
                pdf_url=pdf,
                source="arXiv",
            )
        )
    return papers


async def search_semantic_scholar(query: str, limit: int = 10) -> list[Paper]:
    url = "https://api.semanticscholar.org/graph/v1/paper/search"
    fields = (
        "title,abstract,year,citationCount,venue,authors,externalIds,"
        "openAccessPdf,fieldsOfStudy,url,influentialCitationCount"
    )
    params = {"query": query, "limit": limit, "fields": fields}
    headers = {}
    if settings.SEMANTIC_SCHOLAR_API_KEY:
        headers["x-api-key"] = settings.SEMANTIC_SCHOLAR_API_KEY
    data = await get_json(url, params=params, headers=headers)
    if not data or "data" not in data:
        return []
    papers: list[Paper] = []
    for p in data["data"]:
        ext = p.get("externalIds") or {}
        oa = p.get("openAccessPdf") or {}
        influential = p.get("influentialCitationCount") or 0
        papers.append(
            Paper(
                title=p.get("title") or "",
                authors=[a.get("name", "") for a in (p.get("authors") or [])],
                venue=p.get("venue"),
                year=p.get("year"),
                citation_count=p.get("citationCount"),
                doi=ext.get("DOI"),
                abstract=p.get("abstract"),
                url=p.get("url"),
                pdf_url=oa.get("url"),
                source="Semantic Scholar",
                fields_of_study=p.get("fieldsOfStudy") or [],
                is_seminal=influential >= 50,
            )
        )
    return papers


async def search_openalex(query: str, limit: int = 10) -> list[Paper]:
    """OpenAlex indexes IEEE, ACM, Springer, Elsevier, Nature, etc."""
    url = "https://api.openalex.org/works"
    params = {"search": query, "per-page": limit, "sort": "relevance_score:desc"}
    data = await get_json(url, params=params)
    if not data or "results" not in data:
        return []
    papers: list[Paper] = []
    for w in data["results"]:
        authors = [
            a.get("author", {}).get("display_name", "")
            for a in (w.get("authorships") or [])
        ]
        loc = (w.get("primary_location") or {}).get("source") or {}
        oa = w.get("open_access") or {}
        papers.append(
            Paper(
                title=w.get("title") or "",
                authors=authors,
                venue=loc.get("display_name"),
                year=w.get("publication_year"),
                citation_count=w.get("cited_by_count"),
                doi=(w.get("doi") or "").replace("https://doi.org/", "") or None,
                url=w.get("id"),
                pdf_url=oa.get("oa_url"),
                source="OpenAlex",
                fields_of_study=[
                    c.get("display_name", "") for c in (w.get("concepts") or [])[:5]
                ],
            )
        )
    return papers


async def recommend_papers(query: str, limit: int = 8) -> list[Paper]:
    """Recommended/related papers for a topic via OpenAlex (recent + relevant)."""
    url = "https://api.openalex.org/works"
    params = {
        "search": query,
        "per-page": limit,
        "sort": "cited_by_count:desc",
        "filter": "from_publication_date:2022-01-01",
    }
    data = await get_json(url, params=params)
    if not data or "results" not in data:
        return []
    out: list[Paper] = []
    for w in data["results"]:
        authors = [
            a.get("author", {}).get("display_name", "")
            for a in (w.get("authorships") or [])
        ]
        loc = (w.get("primary_location") or {}).get("source") or {}
        out.append(
            Paper(
                title=w.get("title") or "",
                authors=authors[:6],
                venue=loc.get("display_name"),
                year=w.get("publication_year"),
                citation_count=w.get("cited_by_count"),
                doi=(w.get("doi") or "").replace("https://doi.org/", "") or None,
                url=w.get("id"),
                source="OpenAlex (recommended)",
            )
        )
    return out


async def search_crossref(query: str, limit: int = 10) -> list[Paper]:
    url = "https://api.crossref.org/works"
    params = {"query": query, "rows": limit, "sort": "relevance"}
    data = await get_json(url, params=params)
    if not data:
        return []
    items = (data.get("message") or {}).get("items") or []
    papers: list[Paper] = []
    for it in items:
        title = (it.get("title") or [""])[0]
        if not title:
            continue
        authors = [
            f"{a.get('given', '')} {a.get('family', '')}".strip()
            for a in (it.get("author") or [])
        ]
        year = None
        parts = (it.get("issued") or {}).get("date-parts") or [[None]]
        if parts and parts[0] and parts[0][0]:
            year = parts[0][0]
        papers.append(
            Paper(
                title=title,
                authors=authors,
                venue=(it.get("container-title") or [None])[0],
                year=year,
                citation_count=it.get("is-referenced-by-count"),
                doi=it.get("DOI"),
                url=it.get("URL"),
                source="Crossref",
            )
        )
    return papers
