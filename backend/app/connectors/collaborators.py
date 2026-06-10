"""Collaborator discovery via the OpenAlex Authors API (citation networks)."""
from __future__ import annotations

from app.connectors.http import get_json
from app.schemas import Collaborator, Paper


async def author_profile(
    name: str | None = None, author_id: str | None = None
) -> dict | None:
    """Full profile for an author: metrics, affiliation, topics, and top works.

    Pass `author_id` (an OpenAlex author id like 'A5108093963') to fetch that
    EXACT author — used by the candidate picker to avoid name-collision errors.
    Otherwise searches by `name` and takes the best match.
    """
    if author_id:
        a = await get_json(f"https://api.openalex.org/authors/{author_id}")
        if not a or "id" not in a:
            return None
    else:
        data = await get_json(
            "https://api.openalex.org/authors",
            params={"search": name, "per-page": 1},
        )
        results = (data or {}).get("results") or []
        if not results:
            return None
        a = results[0]
    stats = a.get("summary_stats") or {}
    insts = a.get("last_known_institutions") or a.get("affiliations") or []
    inst_name = None
    if insts:
        first = insts[0]
        inst_name = first.get("display_name") or (first.get("institution") or {}).get("display_name")

    # Fetch the author's most-cited works.
    author_id = (a.get("id") or "").split("/")[-1]
    works_data = await get_json(
        "https://api.openalex.org/works",
        params={
            "filter": f"author.id:{author_id}",
            "sort": "cited_by_count:desc",
            "per-page": 12,
        },
    )
    papers: list[Paper] = []
    for w in (works_data or {}).get("results", []):
        authors = [au.get("author", {}).get("display_name", "") for au in (w.get("authorships") or [])]
        loc = (w.get("primary_location") or {}).get("source") or {}
        papers.append(
            Paper(
                title=w.get("title") or "",
                authors=authors[:6],
                venue=loc.get("display_name"),
                year=w.get("publication_year"),
                citation_count=w.get("cited_by_count"),
                doi=(w.get("doi") or "").replace("https://doi.org/", "") or None,
                url=w.get("id"),
                source="OpenAlex",
            )
        )

    # Yearly publication counts for a mini-trend.
    counts_by_year = sorted(
        ({"year": c["year"], "count": c["works_count"]} for c in (a.get("counts_by_year") or [])),
        key=lambda x: x["year"],
    )

    return {
        "name": a.get("display_name"),
        "openalex_id": a.get("id"),
        "orcid": (a.get("orcid") or "").replace("https://orcid.org/", "") or None,
        "affiliation": inst_name,
        "works_count": a.get("works_count"),
        "cited_by_count": a.get("cited_by_count"),
        "h_index": stats.get("h_index"),
        "i10_index": stats.get("i10_index"),
        "two_year_mean_citedness": round(stats.get("2yr_mean_citedness") or 0, 2),
        "topics": [t.get("display_name") for t in (a.get("topics") or [])[:6]],
        "counts_by_year": counts_by_year,
        "counts_label": "Publications per year",
        "papers": [p.model_dump() for p in papers],
        "source": "OpenAlex",
    }


async def author_candidates(name: str, limit: int = 6) -> list[dict]:
    """Return several matching authors so the UI can disambiguate name clashes."""
    data = await get_json(
        "https://api.openalex.org/authors",
        params={"search": name, "per-page": limit},
    )
    out = []
    for a in (data or {}).get("results", []):
        stats = a.get("summary_stats") or {}
        insts = a.get("last_known_institutions") or a.get("affiliations") or []
        inst = None
        if insts:
            inst = insts[0].get("display_name") or (insts[0].get("institution") or {}).get("display_name")
        out.append({
            "id": (a.get("id") or "").split("/")[-1],  # e.g. A5108093963
            "name": a.get("display_name"),
            "affiliation": inst,
            "works_count": a.get("works_count"),
            "cited_by_count": a.get("cited_by_count"),
            "h_index": stats.get("h_index"),
            "orcid": (a.get("orcid") or "").replace("https://orcid.org/", "") or None,
            "topics": [t.get("display_name") for t in (a.get("topics") or [])[:3]],
        })
    return out


async def search_collaborators(query: str, limit: int = 10) -> list[Collaborator]:
    # Find works on the topic, then aggregate their authors by influence.
    works = await get_json(
        "https://api.openalex.org/works",
        params={"search": query, "per-page": 25, "sort": "cited_by_count:desc"},
    )
    if not works or "results" not in works:
        return []
    seen: dict[str, Collaborator] = {}
    for w in works["results"]:
        concepts = [c.get("display_name", "") for c in (w.get("concepts") or [])[:4]]
        for a in (w.get("authorships") or []):
            author = a.get("author") or {}
            aid = author.get("id")
            name = author.get("display_name")
            if not aid or not name or aid in seen:
                continue
            inst = (a.get("institutions") or [{}])
            affiliation = inst[0].get("display_name") if inst else None
            seen[aid] = Collaborator(
                name=name,
                affiliation=affiliation,
                interests=concepts,
                url=aid,
                match_score=0.0,
            )
            if len(seen) >= limit * 2:
                break
    # Enrich the first `limit` with h-index/citation metrics.
    out: list[Collaborator] = []
    for collab in list(seen.values())[:limit]:
        meta = await get_json(collab.url) if collab.url else None
        if meta:
            stats = meta.get("summary_stats") or {}
            collab.h_index = stats.get("h_index")
            collab.paper_count = meta.get("works_count")
            collab.citation_count = meta.get("cited_by_count")
            collab.match_score = round(min((collab.h_index or 0) / 20, 5.0), 1)
        out.append(collab)
    out.sort(key=lambda c: (c.h_index or 0), reverse=True)
    return out
