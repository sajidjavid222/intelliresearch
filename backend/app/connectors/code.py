"""Open-source implementation connectors: GitHub + Papers With Code."""
from __future__ import annotations

from app.connectors.http import get_json
from app.core.config import settings
from app.schemas import Repository

# Heuristic mapping from language to common framework, used when PwC/GitHub
# don't expose a framework explicitly.
_LANG_FRAMEWORK = {
    "Python": "PyTorch/TensorFlow",
    "Jupyter Notebook": "PyTorch/TensorFlow",
    "C++": "LibTorch/Custom",
    "Cuda": "CUDA",
}


def _reproducibility_score(repo: dict) -> float:
    """Cheap heuristic: stars, has license, has description, recent push."""
    score = 0.0
    stars = repo.get("stargazers_count", 0)
    score += min(stars / 1000, 4.0)  # up to 4 pts
    if repo.get("license"):
        score += 1.0
    if repo.get("description"):
        score += 0.5
    if repo.get("homepage"):
        score += 0.5
    if not repo.get("archived"):
        score += 0.5
    return round(min(score, 5.0), 1)


async def search_github(query: str, limit: int = 10) -> list[Repository]:
    url = "https://api.github.com/search/repositories"
    params = {"q": query, "sort": "stars", "order": "desc", "per_page": limit}
    headers = {"Accept": "application/vnd.github+json"}
    if settings.GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {settings.GITHUB_TOKEN}"
    data = await get_json(url, params=params, headers=headers)
    if not data or "items" not in data:
        return []
    out: list[Repository] = []
    for r in data["items"]:
        lang = r.get("language")
        out.append(
            Repository(
                name=r.get("name", ""),
                full_name=r.get("full_name"),
                description=r.get("description"),
                url=r.get("html_url", ""),
                stars=r.get("stargazers_count"),
                language=lang,
                framework=_LANG_FRAMEWORK.get(lang or "", lang),
                reproducibility_score=_reproducibility_score(r),
                source="GitHub",
            )
        )
    return out


async def search_paperswithcode_repos(query: str, limit: int = 8) -> list[Repository]:
    url = "https://paperswithcode.com/api/v1/search/"
    params = {"q": query, "items_per_page": limit}
    data = await get_json(url, params=params)
    if not data or "results" not in data:
        return []
    out: list[Repository] = []
    for item in data["results"]:
        repo = item.get("repository") or {}
        if not repo.get("url"):
            continue
        out.append(
            Repository(
                name=repo.get("url", "").rstrip("/").split("/")[-1],
                full_name=repo.get("url", "").replace("https://github.com/", ""),
                description=(item.get("paper") or {}).get("title"),
                url=repo.get("url"),
                stars=repo.get("stars"),
                framework=repo.get("framework"),
                reproducibility_score=4.0 if repo.get("is_official") else 3.0,
                source="Papers With Code",
            )
        )
    return out
