"""Dataset source connectors.

Hugging Face, OpenML, Papers With Code, plus Zenodo, DataCite, Harvard
Dataverse, Figshare, Dryad, UCI ML Repository and (with a free token) Kaggle.
Every connector degrades to [] on any error or timeout.
"""
from __future__ import annotations

import asyncio
import base64
import html
import re

from app.connectors.http import get_json, post_json
from app.core.config import settings
from app.schemas import Dataset

_TAG_RE = re.compile(r"<[^>]+>")


async def _try(coro, timeout: float = 8.0):
    """Soft per-source cap so one slow repository can't stall the fan-out."""
    try:
        return await asyncio.wait_for(coro, timeout=timeout)
    except Exception:
        return None


def _clean(text: str | None, maxlen: int = 280) -> str | None:
    if not text:
        return None
    t = html.unescape(_TAG_RE.sub(" ", str(text)))
    t = " ".join(t.split())
    if not t:
        return None
    return (t[:maxlen] + "…") if len(t) > maxlen else t


async def search_huggingface(query: str, limit: int = 10) -> list[Dataset]:
    url = "https://huggingface.co/api/datasets"
    params = {"search": query, "limit": limit, "full": "true", "sort": "downloads"}
    data = await get_json(url, params=params)
    if not isinstance(data, list):
        return []
    out: list[Dataset] = []
    for d in data:
        card = d.get("cardData") or {}
        tags = d.get("tags") or []
        modalities = [t.split(":")[1] for t in tags if t.startswith("modality:")]
        tasks = [t.split(":")[1] for t in tags if t.startswith("task_categories:")]
        out.append(
            Dataset(
                name=d.get("id", ""),
                description=card.get("pretty_name") or d.get("id"),
                license=card.get("license") if isinstance(card.get("license"), str) else None,
                modalities=modalities or ["text"],
                tasks=tasks,
                downloads=d.get("downloads"),
                url=f"https://huggingface.co/datasets/{d.get('id')}",
                download_url=f"https://huggingface.co/datasets/{d.get('id')}",
                source="Hugging Face",
            )
        )
    return out


async def search_openml(query: str, limit: int = 10) -> list[Dataset]:
    # OpenML list API filters server-side by status; we filter by name locally.
    url = "https://www.openml.org/api/v1/json/data/list/limit/200/status/active"
    data = await get_json(url)
    if not data:
        return []
    rows = ((data.get("data") or {}).get("dataset")) or []
    q = query.lower()
    out: list[Dataset] = []
    for r in rows:
        name = r.get("name", "")
        if q not in name.lower():
            continue
        out.append(
            Dataset(
                name=name,
                description=f"OpenML dataset #{r.get('did')}",
                num_samples=str(r.get("NumberOfInstances", "")) or None,
                modalities=["tabular"],
                license="See OpenML",
                url=f"https://www.openml.org/d/{r.get('did')}",
                download_url=f"https://www.openml.org/data/download/{r.get('did')}",
                source="OpenML",
            )
        )
        if len(out) >= limit:
            break
    return out


async def search_paperswithcode_datasets(query: str, limit: int = 10) -> list[Dataset]:
    url = "https://paperswithcode.com/api/v1/datasets/"
    params = {"q": query, "items_per_page": limit}
    data = await get_json(url, params=params)
    if not data or "results" not in data:
        return []
    out: list[Dataset] = []
    for d in data["results"]:
        out.append(
            Dataset(
                name=d.get("name", ""),
                description=d.get("description") or d.get("full_name"),
                modalities=d.get("modalities") or [],
                url=f"https://paperswithcode.com/dataset/{d.get('id')}",
                source="Papers With Code",
            )
        )
    return out


# ---------------- Zenodo (multidisciplinary, DOI'd) ----------------
async def search_zenodo(query: str, limit: int = 10) -> list[Dataset]:
    url = "https://zenodo.org/api/records"
    params = {"q": query, "type": "dataset", "size": limit, "sort": "mostrecent"}
    data = await _try(get_json(url, params=params))
    hits = (((data or {}).get("hits") or {}).get("hits")) or []
    out: list[Dataset] = []
    for h in hits:
        m = h.get("metadata") or {}
        if not m.get("title"):
            continue
        lic = m.get("license")
        lic_id = lic.get("id") if isinstance(lic, dict) else lic
        rt = m.get("resource_type")
        link = (h.get("links") or {}).get("self_html") or f"https://zenodo.org/records/{h.get('id')}"
        out.append(
            Dataset(
                name=m["title"],
                description=_clean(m.get("description")),
                license=lic_id,
                modalities=[rt.get("type")] if isinstance(rt, dict) and rt.get("type") else [],
                url=link,
                download_url=link,
                source="Zenodo",
            )
        )
    return out


# ---------------- DataCite (aggregator across thousands of data repos) ----------------
async def search_datacite(query: str, limit: int = 10) -> list[Dataset]:
    url = "https://api.datacite.org/dois"
    params = {"query": query, "resource-type-id": "dataset", "page[size]": limit}
    data = await _try(get_json(url, params=params))
    items = (data or {}).get("data") or []
    out: list[Dataset] = []
    for it in items:
        a = it.get("attributes") or {}
        title = ((a.get("titles") or [{}])[0]).get("title")
        if not title:
            continue
        desc = ((a.get("descriptions") or [{}])[0]).get("description")
        out.append(
            Dataset(
                name=title,
                description=_clean(desc),
                license=(a.get("rightsList") or [{}])[0].get("rightsIdentifier"),
                url=a.get("url") or (f"https://doi.org/{a.get('doi')}" if a.get("doi") else None),
                source="DataCite",
            )
        )
    return out


# ---------------- Harvard Dataverse ----------------
async def search_dataverse(query: str, limit: int = 10) -> list[Dataset]:
    url = "https://dataverse.harvard.edu/api/search"
    params = {"q": query, "type": "dataset", "per_page": limit}
    data = await _try(get_json(url, params=params))
    items = (((data or {}).get("data") or {}).get("items")) or []
    out: list[Dataset] = []
    for it in items:
        if not it.get("name"):
            continue
        out.append(
            Dataset(
                name=it["name"],
                description=_clean(it.get("description")),
                url=it.get("url"),
                source="Harvard Dataverse",
            )
        )
    return out


# ---------------- Figshare (datasets, figures, supplementary files) ----------------
async def search_figshare(query: str, limit: int = 10) -> list[Dataset]:
    body = {"search_for": query, "page_size": limit, "item_type": 3}  # 3 = dataset
    data = await _try(post_json("https://api.figshare.com/v2/articles/search", body))
    if not isinstance(data, list):
        return []
    out: list[Dataset] = []
    for a in data:
        title = _clean(a.get("title"), 200)
        if not title:
            continue
        link = a.get("url_public_html")
        out.append(
            Dataset(
                name=title,
                url=link,
                download_url=link,
                source="Figshare",
            )
        )
    return out


# ---------------- Dryad (curated research data) ----------------
async def search_dryad(query: str, limit: int = 10) -> list[Dataset]:
    url = "https://datadryad.org/api/v2/search"
    params = {"q": query, "per_page": limit}
    data = await _try(get_json(url, params=params))
    ds = (((data or {}).get("_embedded") or {}).get("stash:datasets")) or []
    out: list[Dataset] = []
    for d in ds:
        if not d.get("title"):
            continue
        doi = (d.get("identifier") or "").replace("doi:", "")
        out.append(
            Dataset(
                name=d["title"],
                description=_clean(d.get("abstract")),
                url=f"https://doi.org/{doi}" if doi else None,
                source="Dryad",
            )
        )
    return out


# ---------------- UCI ML Repository (classic benchmark datasets) ----------------
async def search_uci(query: str, limit: int = 10) -> list[Dataset]:
    # The list API returns every dataset; we filter by name like OpenML does.
    data = await _try(get_json("https://archive.ics.uci.edu/api/datasets/list"))
    rows = (data or {}).get("data") or []
    q = query.lower()
    out: list[Dataset] = []
    for r in rows:
        name = r.get("name", "")
        if q not in name.lower():
            continue
        did = r.get("id")
        out.append(
            Dataset(
                name=name,
                description=f"UCI ML Repository dataset #{did}",
                modalities=["tabular"],
                url=f"https://archive.ics.uci.edu/dataset/{did}",
                source="UCI ML Repository",
            )
        )
        if len(out) >= limit:
            break
    return out


# ---------------- Kaggle (needs a free API token) ----------------
async def search_kaggle(query: str, limit: int = 10) -> list[Dataset]:
    if not (settings.KAGGLE_USERNAME and settings.KAGGLE_KEY):
        return []
    token = base64.b64encode(f"{settings.KAGGLE_USERNAME}:{settings.KAGGLE_KEY}".encode()).decode()
    url = "https://www.kaggle.com/api/v1/datasets/list"
    data = await _try(
        get_json(url, params={"search": query}, headers={"Authorization": f"Basic {token}"})
    )
    if not isinstance(data, list):
        return []
    out: list[Dataset] = []
    for d in data[:limit]:
        ref = d.get("ref")
        link = f"https://www.kaggle.com/datasets/{ref}" if ref else d.get("url")
        out.append(
            Dataset(
                name=d.get("title") or ref or "",
                description=_clean(d.get("subtitle")),
                license=d.get("licenseName"),
                downloads=d.get("totalDownloads") or d.get("downloadCount"),
                url=link,
                download_url=link,
                source="Kaggle",
            )
        )
    return out
