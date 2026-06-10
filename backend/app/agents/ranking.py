"""Relevance ranking and seminal-paper detection for papers.

Combines keyword relevance, citation impact, recency, and influence into a
single 0–1 score. This is a transparent heuristic that works without an LLM;
when an LLM is configured the orchestrator can additionally re-rank.
"""
from __future__ import annotations

import math
from datetime import datetime

from app.schemas import Paper

# DOI registrant prefixes → publisher. These are authoritative.
_DOI_PUBLISHERS = {
    "10.1109": "IEEE",
    "10.1145": "ACM",
    "10.1038": "Nature",
    "10.1007": "Springer",
    "10.1016": "Elsevier",
    "10.1002": "Wiley",
    "10.1371": "PLOS",
    "10.3390": "MDPI",
    "10.1080": "Taylor & Francis",
    "10.1093": "Oxford University Press",
    "10.1017": "Cambridge University Press",
    "10.1162": "MIT Press",
    "10.18653": "ACL",
    "10.5555": "Conference Proceedings",
}

# Venue keyword → publisher, as a fallback when no DOI is present.
_VENUE_PUBLISHERS = [
    ("ieee", "IEEE"),
    ("acm", "ACM"),
    ("nature", "Nature"),
    ("springer", "Springer"),
    ("lecture notes", "Springer"),
    ("elsevier", "Elsevier"),
    ("arxiv", "arXiv"),
    ("plos", "PLOS"),
    ("mdpi", "MDPI"),
    ("sensors", "MDPI"),
    ("wiley", "Wiley"),
    ("acl", "ACL"),
    ("neurips", "NeurIPS"),
    ("advances in neural", "NeurIPS"),
]


def detect_publisher(paper: Paper) -> str | None:
    if paper.doi:
        prefix = paper.doi.strip().split("/")[0]
        if prefix in _DOI_PUBLISHERS:
            return _DOI_PUBLISHERS[prefix]
    venue = (paper.venue or "").lower()
    for kw, pub in _VENUE_PUBLISHERS:
        if kw in venue:
            return pub
    return None


def _keyword_overlap(query: str, paper: Paper) -> float:
    terms = {w.lower() for w in query.split() if len(w) > 2}
    if not terms:
        return 0.0
    text = f"{paper.title} {paper.abstract or ''} {' '.join(paper.fields_of_study)}".lower()
    hits = sum(1 for t in terms if t in text)
    # Title hits weigh more.
    title_hits = sum(1 for t in terms if t in (paper.title or "").lower())
    return min((hits + title_hits) / (len(terms) * 1.5), 1.0)


def rank_papers(query: str, papers: list[Paper]) -> list[Paper]:
    now = datetime.utcnow().year
    max_cites = max((p.citation_count or 0) for p in papers) or 1
    for p in papers:
        rel = _keyword_overlap(query, p)
        cites = p.citation_count or 0
        impact = math.log1p(cites) / math.log1p(max_cites)
        recency = 0.0
        if p.year:
            age = max(now - p.year, 0)
            recency = max(0.0, 1.0 - age / 15)  # decays over ~15 years
        score = 0.5 * rel + 0.3 * impact + 0.2 * recency
        p.relevance_score = round(score, 4)
        # Seminal: highly cited and either flagged influential or old+canonical.
        if (cites >= 500) or p.is_seminal or (cites >= 200 and p.year and p.year < now - 5):
            p.is_seminal = True
        if not p.publisher:
            p.publisher = detect_publisher(p)
    papers.sort(key=lambda x: x.relevance_score, reverse=True)
    return papers


def dedupe_papers(papers: list[Paper]) -> list[Paper]:
    seen: dict[str, Paper] = {}
    for p in papers:
        key = (p.doi or p.title or "").lower().strip()
        if not key:
            continue
        if key not in seen:
            seen[key] = p
        else:
            # Keep the record with the most metadata.
            existing = seen[key]
            if (p.citation_count or 0) > (existing.citation_count or 0):
                seen[key] = p
    return list(seen.values())
