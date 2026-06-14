"""Collaborator discovery via the OpenAlex Authors API (citation networks)."""
from __future__ import annotations

from app.connectors.http import get_json
from app.schemas import Collaborator, Paper

# Institution/stop words people often append to a name (e.g. "sajid javid iiitd").
# OpenAlex searches author *names*, so these break the match and must be stripped.
_STOP = {
    "university", "univ", "institute", "institution", "college", "school",
    "department", "dept", "of", "the", "lab", "laboratory", "center", "centre",
    "iiit", "iiitd", "iit", "nit", "bits", "mit", "stanford", "harvard", "cmu",
    "delhi", "mumbai", "bangalore", "bengaluru", "hyderabad", "kanpur", "madras",
}


def _name_variants(name: str) -> list[str]:
    """Progressively simpler forms of a messy author query, best first:
    the raw text, the text with institution/stop words removed, then trailing
    words dropped (names usually come first, institution after)."""
    name = (name or "").strip()
    variants: list[str] = []
    if name:
        variants.append(name)
        cleaned = " ".join(
            w for w in name.split() if w.lower().strip(".,") not in _STOP
        )
        if cleaned and cleaned.lower() != name.lower():
            variants.append(cleaned)
        toks = name.split()
        while len(toks) > 2:
            toks = toks[:-1]
            variants.append(" ".join(toks))
        if len(name.split()) > 2:
            variants.append(" ".join(name.split()[:2]))
    seen, out = set(), []
    for v in variants:
        k = v.lower()
        if v and k not in seen:
            seen.add(k)
            out.append(v)
    return out


async def _authors_search(name: str, limit: int) -> list[dict]:
    """Search OpenAlex authors, progressively simplifying the query until we
    get matches (so 'sajid javid iiitd' falls back to 'sajid javid')."""
    for variant in _name_variants(name):
        data = await get_json(
            "https://api.openalex.org/authors",
            params={"search": variant, "per-page": limit},
        )
        results = (data or {}).get("results") or []
        if results:
            return results
    return []


# ---- Crossref fallback (OpenAlex now budget-throttles shared cloud IPs) ----
def _author_matches(full: str, qtoks: list[str]) -> bool:
    low = full.lower()
    return bool(full) and all(t in low for t in qtoks)


def _crossref_orcid(a: dict) -> str | None:
    return ((a.get("ORCID") or "").rsplit("/", 1)[-1]) or None


async def _crossref_candidates(name: str, limit: int) -> list[dict]:
    """Disambiguation candidates from Crossref when OpenAlex is unavailable."""
    from collections import Counter

    data = await get_json(
        "https://api.crossref.org/works",
        params={"query.author": name, "rows": 60, "select": "author"},
    )
    items = ((data or {}).get("message") or {}).get("items") or []
    qtoks = [t for t in name.lower().split() if len(t) > 1]
    counts: Counter = Counter()
    info: dict[str, dict] = {}
    for it in items:
        for a in it.get("author") or []:
            full = f"{a.get('given', '')} {a.get('family', '')}".strip()
            if not _author_matches(full, qtoks):
                continue
            low = full.lower()
            counts[low] += 1
            if low not in info:
                affs = a.get("affiliation") or []
                info[low] = {
                    "name": full,
                    "orcid": _crossref_orcid(a),
                    "affiliation": affs[0].get("name") if affs else None,
                }
    out = []
    for low, c in counts.most_common(limit):
        d = info[low]
        out.append({
            "id": "crossref:" + d["name"], "name": d["name"],
            "affiliation": d["affiliation"], "works_count": c,
            "cited_by_count": None, "h_index": None,
            "orcid": d["orcid"], "topics": [],
        })
    return out


async def _crossref_profile(name: str) -> dict | None:
    """Author profile + top works from Crossref (no h-index/citation metrics)."""
    # Don't sort by citations server-side — the fuzzy author query would surface
    # famous *other* same-surname authors. Scan a wide page, keep only works that
    # actually list this author, then rank those by citations ourselves.
    data = await get_json(
        "https://api.crossref.org/works",
        params={
            "query.author": name, "rows": 80,
            "select": "title,issued,container-title,is-referenced-by-count,DOI,author,URL",
        },
    )
    items = ((data or {}).get("message") or {}).get("items") or []
    qtoks = [t for t in name.lower().split() if len(t) > 1]
    papers: list[Paper] = []
    affiliation = None
    for it in items:
        authors = [
            f"{a.get('given', '')} {a.get('family', '')}".strip()
            for a in (it.get("author") or [])
        ]
        if not any(_author_matches(au, qtoks) for au in authors):
            continue
        if affiliation is None:
            for a in it.get("author") or []:
                full = f"{a.get('given', '')} {a.get('family', '')}".strip()
                if _author_matches(full, qtoks) and a.get("affiliation"):
                    affiliation = a["affiliation"][0].get("name")
                    break
        issued = (it.get("issued") or {}).get("date-parts") or [[None]]
        year = issued[0][0] if issued and issued[0] else None
        ct = it.get("container-title") or []
        papers.append(Paper(
            title=(it.get("title") or [""])[0] or "",
            authors=authors[:6], venue=ct[0] if ct else None, year=year,
            citation_count=it.get("is-referenced-by-count"),
            doi=it.get("DOI"), url=it.get("URL"), source="Crossref",
        ))
    papers.sort(key=lambda p: p.citation_count or 0, reverse=True)
    papers = papers[:14]
    if not papers:
        return None
    return {
        "name": name.title(), "openalex_id": None, "orcid": None,
        "affiliation": affiliation, "works_count": len(papers),
        "cited_by_count": None, "h_index": None, "i10_index": None,
        "two_year_mean_citedness": 0, "topics": [],
        "counts_by_year": [], "counts_label": "Publications per year",
        "papers": [p.model_dump() for p in papers], "source": "Crossref",
    }


async def author_profile(
    name: str | None = None, author_id: str | None = None
) -> dict | None:
    """Full profile for an author: metrics, affiliation, topics, and top works.

    Pass `author_id` (an OpenAlex author id like 'A5108093963') to fetch that
    EXACT author — used by the candidate picker to avoid name-collision errors.
    Otherwise searches by `name` and takes the best match.
    """
    # Crossref-sourced candidate the user picked from the picker.
    if author_id and author_id.startswith("crossref:"):
        return await _crossref_profile(author_id[len("crossref:"):])
    if author_id:
        a = await get_json(f"https://api.openalex.org/authors/{author_id}")
        if not a or "id" not in a:
            return None
    else:
        results = await _authors_search(name or "", 5)
        if not results:
            # OpenAlex throttled / no match — fall back to Crossref.
            return await _crossref_profile(name or "")
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
    results = await _authors_search(name, limit)
    if not results:
        # OpenAlex throttled (daily budget) — disambiguate via Crossref instead.
        return await _crossref_candidates(name, limit)
    out = []
    for a in results:
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
