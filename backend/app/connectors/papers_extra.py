"""Additional paper source connectors: CORE, PubMed, DOAJ, DBLP.

All are free and work key-free (CORE works key-free at low limits; set
CORE_API_KEY for higher throughput). Each degrades to [] on any error.
"""
from __future__ import annotations

import asyncio
import html
import re

from app.connectors.http import get_json
from app.core.config import settings
from app.schemas import Paper

_TAG_RE = re.compile(r"<[^>]+>")


async def _try(coro, timeout: float = 8.0):
    """Await a connector call with a soft cap so one slow source can't stall the
    whole fan-out. Returns None on timeout or error."""
    try:
        return await asyncio.wait_for(coro, timeout=timeout)
    except Exception:
        return None


def _strip(text: str | None) -> str | None:
    if not text:
        return None
    t = html.unescape(_TAG_RE.sub(" ", str(text)))
    t = " ".join(t.split())
    return t or None


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


# ---------------- Europe PMC (life sciences + preprints + full text) ----------------
async def search_europepmc(query: str, limit: int = 10) -> list[Paper]:
    url = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"
    params = {"query": query, "format": "json", "pageSize": limit, "resultType": "core"}
    data = await _try(get_json(url, params=params))
    results = (((data or {}).get("resultList") or {}).get("result")) or []
    out: list[Paper] = []
    for r in results:
        title = (r.get("title") or "").strip().rstrip(".")
        if not title:
            continue
        src, pid = r.get("source") or "MED", r.get("id")
        authors = [a.strip() for a in (r.get("authorString") or "").rstrip(".").split(",") if a.strip()]
        year = int(r["pubYear"]) if str(r.get("pubYear", "")).isdigit() else None
        pdf = next(
            (u.get("url") for u in (((r.get("fullTextUrlList") or {}).get("fullTextUrl")) or [])
             if u.get("documentStyle") == "pdf"),
            None,
        )
        out.append(
            Paper(
                title=title,
                authors=authors[:8],
                venue=r.get("journalTitle"),
                year=year,
                doi=r.get("doi"),
                abstract=_strip(r.get("abstractText")),
                citation_count=r.get("citedByCount"),
                url=f"https://europepmc.org/article/{src}/{pid}" if pid else None,
                pdf_url=pdf,
                source="Europe PMC",
            )
        )
    return out


# ---------------- bioRxiv / medRxiv (preprints, via Crossref's CSH prefix) ----------------
async def search_biorxiv(query: str, limit: int = 10) -> list[Paper]:
    """bioRxiv/medRxiv have no keyword API, but Crossref indexes them as
    posted-content preprints under the Cold Spring Harbor DOI prefix 10.1101."""
    url = "https://api.crossref.org/works"
    params = {
        "query": query,
        "rows": limit,
        "filter": "prefix:10.1101,type:posted-content",
        "sort": "relevance",
    }
    data = await _try(get_json(url, params=params))
    items = ((data or {}).get("message") or {}).get("items") or []
    out: list[Paper] = []
    for it in items:
        title = (it.get("title") or [""])[0]
        if not title:
            continue
        authors = [
            f"{a.get('given', '')} {a.get('family', '')}".strip() for a in (it.get("author") or [])
        ]
        parts = (it.get("issued") or {}).get("date-parts") or [[None]]
        year = parts[0][0] if parts and parts[0] else None
        out.append(
            Paper(
                title=title.strip(),
                authors=[a for a in authors if a][:8],
                venue=it.get("group-title") or "bioRxiv / medRxiv",
                year=year,
                doi=it.get("DOI"),
                abstract=_strip(it.get("abstract")),
                url=it.get("URL"),
                citation_count=it.get("is-referenced-by-count"),
                source="bioRxiv / medRxiv",
            )
        )
    return out


# ---------------- OpenAIRE (EU open-science aggregator) ----------------
async def search_openaire(query: str, limit: int = 10) -> list[Paper]:
    url = "https://api.openaire.eu/search/publications"
    params = {"keywords": query, "format": "json", "size": limit}
    data = await _try(get_json(url, params=params))
    results = (((data or {}).get("response") or {}).get("results") or {}).get("result") or []
    if isinstance(results, dict):
        results = [results]

    def first(x):
        return (x[0] if x else None) if isinstance(x, list) else x

    def text(x):
        x = first(x)
        return (x.get("$") or x.get("content")) if isinstance(x, dict) else x

    out: list[Paper] = []
    for r in results:
        try:
            meta = (((r.get("metadata") or {}).get("oaf:entity") or {}).get("oaf:result")) or {}
            title = text(meta.get("title"))
            if not title:
                continue
            creators = meta.get("creator")
            creators = [creators] if isinstance(creators, dict) else (creators or [])
            authors = [text(c) for c in creators]
            date = text(meta.get("dateofacceptance")) or ""
            year = int(date[:4]) if date[:4].isdigit() else None
            pids = meta.get("pid")
            pids = [pids] if isinstance(pids, dict) else (pids or [])
            doi = next(
                (p.get("$") for p in pids if isinstance(p, dict) and p.get("@classid") == "doi"),
                None,
            )
            out.append(
                Paper(
                    title=str(title).strip(),
                    authors=[a for a in authors if a][:8],
                    year=year,
                    doi=doi,
                    url=f"https://doi.org/{doi}" if doi else None,
                    source="OpenAIRE",
                )
            )
        except Exception:
            continue
    return out


# ---------------- INSPIRE-HEP (high-energy physics) ----------------
async def search_inspire(query: str, limit: int = 10) -> list[Paper]:
    url = "https://inspirehep.net/api/literature"
    params = {
        "q": query,
        "size": limit,
        "fields": "titles,authors.full_name,publication_info,dois,citation_count,abstracts,earliest_date",
    }
    data = await _try(get_json(url, params=params))
    hits = (((data or {}).get("hits") or {}).get("hits")) or []
    out: list[Paper] = []
    for h in hits:
        m = h.get("metadata") or {}
        title = ((m.get("titles") or [{}])[0]).get("title")
        if not title:
            continue
        # full_name is "Last, First" — flip to "First Last".
        authors = []
        for a in (m.get("authors") or [])[:8]:
            fn = a.get("full_name", "")
            authors.append(" ".join(reversed(fn.split(", "))) if ", " in fn else fn)
        ed = m.get("earliest_date") or ""
        year = int(ed[:4]) if ed[:4].isdigit() else None
        pi = m.get("publication_info") or []
        out.append(
            Paper(
                title=title.strip(),
                authors=[a for a in authors if a],
                venue=pi[0].get("journal_title") if pi else None,
                year=year,
                doi=((m.get("dois") or [{}])[0]).get("value"),
                abstract=_strip(((m.get("abstracts") or [{}])[0]).get("value")),
                citation_count=m.get("citation_count"),
                url=f"https://inspirehep.net/literature/{m.get('control_number')}" if m.get("control_number") else None,
                source="INSPIRE-HEP",
            )
        )
    return out


# ---------------- HAL (French national open archive) ----------------
async def search_hal(query: str, limit: int = 10) -> list[Paper]:
    url = "https://api.archives-ouvertes.fr/search/"
    params = {
        "q": query,
        "rows": limit,
        "wt": "json",
        "fl": "title_s,authFullName_s,producedDateY_i,doiId_s,uri_s,journalTitle_s",
    }
    data = await _try(get_json(url, params=params))
    docs = (((data or {}).get("response") or {}).get("docs")) or []
    out: list[Paper] = []
    for d in docs:
        t = d.get("title_s")
        title = (t[0] if isinstance(t, list) else t) or ""
        if not title:
            continue
        j = d.get("journalTitle_s")
        out.append(
            Paper(
                title=title.strip(),
                authors=(d.get("authFullName_s") or [])[:8],
                venue=(j[0] if isinstance(j, list) else j),
                year=d.get("producedDateY_i"),
                doi=d.get("doiId_s"),
                url=d.get("uri_s"),
                source="HAL",
            )
        )
    return out


# ---------------- NASA ADS (astronomy & astrophysics; needs a free token) ----------------
async def search_ads(query: str, limit: int = 10) -> list[Paper]:
    if not settings.ADS_TOKEN:
        return []
    url = "https://api.adsabs.harvard.edu/v1/search/query"
    params = {
        "q": query,
        "rows": limit,
        "fl": "title,author,year,bibcode,citation_count,doi,abstract,pub",
        "sort": "score desc",
    }
    headers = {"Authorization": f"Bearer {settings.ADS_TOKEN}"}
    data = await _try(get_json(url, params=params, headers=headers))
    docs = (((data or {}).get("response") or {}).get("docs")) or []
    out: list[Paper] = []
    for d in docs:
        title = (d.get("title") or [None])[0]
        if not title:
            continue
        bib = d.get("bibcode")
        out.append(
            Paper(
                title=title.strip(),
                authors=(d.get("author") or [])[:8],
                venue=d.get("pub"),
                year=int(d["year"]) if str(d.get("year", "")).isdigit() else None,
                doi=(d.get("doi") or [None])[0],
                abstract=_strip(d.get("abstract")),
                citation_count=d.get("citation_count"),
                url=f"https://ui.adsabs.harvard.edu/abs/{bib}/abstract" if bib else None,
                source="NASA ADS",
            )
        )
    return out


# ---------------- OpenReview (peer-reviewed venue submissions: ICLR/NeurIPS/…) ----------------
async def search_openreview(query: str, limit: int = 10) -> list[Paper]:
    url = "https://api2.openreview.net/notes/search"
    data = await _try(get_json(url, params={"term": query, "limit": limit}))
    notes = (data or {}).get("notes") or []

    def cv(content: dict, key: str):
        v = content.get(key)
        return v.get("value") if isinstance(v, dict) else v

    out: list[Paper] = []
    for n in notes:
        c = n.get("content") or {}
        title = cv(c, "title")
        if not title:
            continue
        authors = cv(c, "authors") or []
        if isinstance(authors, str):
            authors = [authors]
        venue = cv(c, "venue")
        pdf = cv(c, "pdf")
        forum = n.get("forum")
        out.append(
            Paper(
                title=str(title).strip(),
                authors=[a for a in authors if a][:8],
                venue=venue if isinstance(venue, str) else None,
                abstract=_strip(cv(c, "abstract")),
                url=f"https://openreview.net/forum?id={forum}" if forum else None,
                pdf_url=f"https://openreview.net{pdf}" if isinstance(pdf, str) and pdf.startswith("/") else None,
                source="OpenReview",
            )
        )
    return out


# ---------------- Unpaywall (DOI → open-access PDF; enriches existing results) ----------------
async def enrich_with_unpaywall(papers: list[Paper], limit: int = 10) -> list[Paper]:
    """Fill in a free, legal PDF link for ranked papers that have a DOI but no
    open-access PDF yet — turning more results into one-click 'read it now'."""
    email = settings.UNPAYWALL_EMAIL or settings.OPENALEX_MAILTO
    if not email:
        return papers
    targets = [p for p in papers if p.doi and not p.pdf_url][:limit]
    if not targets:
        return papers

    async def one(p: Paper):
        doi = p.doi.replace("https://doi.org/", "").strip()
        data = await _try(get_json(f"https://api.unpaywall.org/v2/{doi}", params={"email": email}), 6.0)
        if data and data.get("is_oa"):
            loc = data.get("best_oa_location") or {}
            pdf = loc.get("url_for_pdf") or loc.get("url")
            if pdf:
                p.pdf_url = pdf

    await asyncio.gather(*(one(p) for p in targets), return_exceptions=True)
    return papers
