"""Dataset source connectors: Hugging Face, OpenML, Papers With Code."""
from __future__ import annotations

from app.connectors.http import get_json
from app.schemas import Dataset


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
