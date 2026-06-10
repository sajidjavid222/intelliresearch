"""Patent connector.

Primary source: Google Patents' public XHR query endpoint (key-free).
Optional fallback: USPTO PatentsView (now requires an API key in CORE_API_KEY-
style header; only used if a key is configured). Both degrade to an empty list.
"""
from __future__ import annotations

import json
from urllib.parse import quote

from app.connectors.http import get_json, get_text
from app.schemas import Patent


async def search_patents(query: str, limit: int = 10) -> list[Patent]:
    patents = await _google_patents(query, limit)
    if patents:
        return patents
    return await _patentsview(query, limit)


async def _google_patents(query: str, limit: int) -> list[Patent]:
    # The XHR endpoint expects a url-encoded inner query string.
    inner = quote(f"q={query}&num={limit}", safe="")
    url = f"https://patents.google.com/xhr/query?url={inner}&exp="
    text = await get_text(url, headers={"User-Agent": "Mozilla/5.0"})
    if not text:
        return []
    try:
        data = json.loads(text)
    except Exception:
        return []
    clusters = ((data.get("results") or {}).get("cluster")) or []
    out: list[Patent] = []
    for cluster in clusters:
        for r in cluster.get("result", []):
            pat = r.get("patent") or {}
            pid = (r.get("id") or "").replace("patent/", "").split("/")[0]
            title = _strip_tags(pat.get("title", "")).strip()
            if not title:
                continue
            year = None
            pdate = pat.get("priority_date") or pat.get("publication_date") or ""
            if len(pdate) >= 4 and pdate[:4].isdigit():
                year = int(pdate[:4])
            out.append(
                Patent(
                    title=title,
                    patent_number=pid or None,
                    inventors=[pat.get("inventor")] if pat.get("inventor") else [],
                    assignee=pat.get("assignee"),
                    year=year,
                    abstract=_strip_tags(pat.get("snippet", "")) or None,
                    url=f"https://patents.google.com/patent/{pid}" if pid else None,
                    source="Google Patents",
                )
            )
            if len(out) >= limit:
                return out
    return out


async def _patentsview(query: str, limit: int) -> list[Patent]:
    """Keyed USPTO fallback (returns [] without a key / on error)."""
    url = "https://search.patentsview.org/api/v1/patent/"
    q = json.dumps({"_text_any": {"patent_title": query}})
    f = json.dumps(["patent_id", "patent_title", "patent_abstract", "patent_date"])
    o = json.dumps({"size": limit})
    data = await get_json(url, params={"q": q, "f": f, "o": o})
    if not data or not data.get("patents"):
        return []
    out: list[Patent] = []
    for p in data["patents"]:
        pid = p.get("patent_id")
        year = int(p["patent_date"][:4]) if p.get("patent_date") else None
        out.append(
            Patent(
                title=p.get("patent_title", ""),
                patent_number=pid,
                year=year,
                abstract=p.get("patent_abstract"),
                url=f"https://patents.google.com/patent/US{pid}" if pid else None,
                source="USPTO / PatentsView",
            )
        )
    return out


def _strip_tags(s: str) -> str:
    import re

    return re.sub(r"<[^>]+>", "", s or "").replace("&hellip;", "…").strip()
