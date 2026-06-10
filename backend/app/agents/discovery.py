"""Discovery agents: papers, datasets, code, patents, conferences, grants,
collaborators. Each fans out across connectors concurrently and normalizes.
"""
from __future__ import annotations

import asyncio

from app.agents.ranking import dedupe_papers, rank_papers
from app.connectors import (
    code,
    collaborators,
    conferences,
    datasets,
    grants,
    patents,
    papers as papers_conn,
    papers_extra,
)
from app.schemas import (
    Collaborator,
    Conference,
    Dataset,
    Grant,
    Paper,
    Patent,
    Repository,
)


async def _gather(*coros):
    """Run coroutines concurrently, ignoring individual failures."""
    results = await asyncio.gather(*coros, return_exceptions=True)
    out = []
    for r in results:
        if isinstance(r, Exception):
            continue
        out.extend(r or [])
    return out


# Generic words that hurt precision on keyword-AND sources like GitHub/HF.
_WEAK = {
    "indoor", "using", "based", "novel", "recent", "approach", "method",
    "system", "deep", "learning", "model", "a", "an", "the", "with", "for",
    "of", "on", "and", "in", "to",
}


def _core_terms(topic: str, k: int = 2) -> str:
    """Keep the k most distinctive (longest, non-weak) terms from a topic.

    Sparse keyword-AND sources (GitHub, Hugging Face) return nothing when a
    natural-language topic is ANDed verbatim, so we narrow to the core nouns.
    """
    words = [w for w in topic.split() if w.lower().strip(".,") not in _WEAK]
    words.sort(key=len, reverse=True)
    chosen = words[:k] if words else topic.split()[:k]
    # Preserve original order for readability.
    order = {w: i for i, w in enumerate(topic.split())}
    chosen.sort(key=lambda w: order.get(w, 0))
    return " ".join(chosen) or topic


# ---------- Agent 1: Research Paper Discovery ----------
async def paper_discovery_agent(query: str, limit: int = 15) -> list[Paper]:
    # Per-source cap: pull fewer from each of the many sources, then dedupe/rank.
    per_source = max(8, limit)
    raw = await _gather(
        papers_conn.search_semantic_scholar(query, per_source),
        papers_conn.search_arxiv(query, per_source),
        papers_conn.search_openalex(query, per_source),
        papers_conn.search_crossref(query, per_source),
        papers_extra.search_core(query, per_source),
        papers_extra.search_pubmed(query, per_source),
        papers_extra.search_doaj(query, per_source),
        papers_extra.search_dblp(query, per_source),
    )
    deduped = dedupe_papers(raw)
    ranked = rank_papers(query, deduped)
    return ranked[:limit]


# ---------- Agent 3: Dataset Discovery ----------
async def dataset_discovery_agent(query: str, limit: int = 12) -> list[Dataset]:
    raw = await _gather(
        datasets.search_huggingface(query, limit),
        datasets.search_paperswithcode_datasets(query, limit),
        datasets.search_openml(query, limit),
    )
    # Sparse sources often miss a long topic; retry with core keywords.
    if not raw:
        core = _core_terms(query, 2)
        if core != query:
            raw = await _gather(
                datasets.search_huggingface(core, limit),
                datasets.search_paperswithcode_datasets(core, limit),
                datasets.search_openml(core, limit),
            )
    return raw[:limit]


# ---------- Agent 6: Open-Source Implementation ----------
async def code_discovery_agent(query: str, limit: int = 12) -> list[Repository]:
    raw = await _gather(
        code.search_github(query, limit),
        code.search_paperswithcode_repos(query, limit),
    )
    if not raw:
        core = _core_terms(query, 2)
        if core != query:
            raw = await _gather(
                code.search_github(core, limit),
                code.search_paperswithcode_repos(core, limit),
            )
    # Dedupe by url.
    seen, out = set(), []
    for r in raw:
        if r.url in seen:
            continue
        seen.add(r.url)
        out.append(r)
    out.sort(key=lambda r: (r.stars or 0), reverse=True)
    return out[:limit]


# ---------- Agent 7: Patent Intelligence ----------
async def patent_agent(query: str, limit: int = 10) -> list[Patent]:
    return await patents.search_patents(query, limit)


# ---------- Agent 5: Conference / CFP ----------
async def conference_agent(query: str, limit: int = 10) -> list[Conference]:
    return await conferences.search_conferences(query, limit)


# ---------- Agent 4: Grant Discovery ----------
async def grant_agent(query: str, profile: str = "", limit: int = 12) -> list[Grant]:
    return await grants.search_grants(query, profile, limit)


# ---------- Agent 10: Collaboration ----------
async def collaboration_agent(query: str, limit: int = 10) -> list[Collaborator]:
    return await collaborators.search_collaborators(query, limit)
