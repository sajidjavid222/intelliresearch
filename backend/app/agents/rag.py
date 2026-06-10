"""RAG: answer questions grounded in a topic's papers, with citations.

Retrieval is a lightweight lexical scorer over paper titles+abstracts (works
with zero infra and is fast for the ~tens of papers a search returns). The
structure (retrieve top-k → build context → cite-grounded generation) maps
directly onto a Qdrant vector store if you later embed at corpus scale.
"""
from __future__ import annotations

import re
from collections import Counter

from app.agents import discovery
from app.schemas import Paper
from app.services.llm import get_llm

_WORD = re.compile(r"[a-z0-9]+")


def _tokens(text: str) -> list[str]:
    return _WORD.findall((text or "").lower())


def _score(question_terms: Counter, paper: Paper) -> float:
    doc = f"{paper.title} {paper.abstract or ''} {' '.join(paper.fields_of_study)}"
    toks = _tokens(doc)
    if not toks:
        return 0.0
    tf = Counter(toks)
    overlap = sum(tf[t] for t in question_terms)
    # Normalize by length so long abstracts don't dominate; small citation bonus.
    base = overlap / (len(toks) ** 0.5)
    return base * (1 + min((paper.citation_count or 0) / 5000, 0.5))


def retrieve(question: str, papers: list[Paper], k: int = 6) -> list[Paper]:
    qterms = Counter(t for t in _tokens(question) if len(t) > 2)
    if not qterms:
        return papers[:k]
    ranked = sorted(papers, key=lambda p: _score(qterms, p), reverse=True)
    return [p for p in ranked if _score(qterms, p) > 0][:k] or papers[:k]


def _context(papers: list[Paper]) -> str:
    blocks = []
    for i, p in enumerate(papers, 1):
        blocks.append(
            f"[{i}] {p.title} ({p.year or 'n.d.'}, {p.venue or '?'}, "
            f"{p.citation_count or 0} cites)\n{(p.abstract or 'No abstract available.')[:700]}"
        )
    return "\n\n".join(blocks)


async def chat_with_papers(
    question: str, topic: str, papers: list[Paper] | None = None
) -> dict:
    """Answer `question` grounded in papers for `topic`.

    Returns the answer plus the sources actually used (for citation chips).
    """
    if papers is None:
        papers = await discovery.paper_discovery_agent(topic or question, 15)
    if not papers:
        return {"answer": "I couldn't find papers on this topic to answer from.", "sources": []}

    top = retrieve(question, papers, k=6)
    llm = get_llm()

    if not llm.available:
        # Graceful, still-useful fallback: return the most relevant snippets.
        bullets = "\n".join(
            f"• [{i}] {p.title} ({p.year or 'n.d.'}) — {(p.abstract or '')[:160]}…"
            for i, p in enumerate(top, 1)
        )
        return {
            "answer": (
                "LLM not configured, so here are the most relevant papers to your "
                f"question:\n\n{bullets}\n\n(Set a Gemini/OpenAI/Anthropic key for "
                "synthesized answers.)"
            ),
            "sources": [_source(p, i) for i, p in enumerate(top, 1)],
        }

    system = (
        "You are a meticulous research assistant. Answer the user's question using "
        "ONLY the provided papers. Cite claims inline with [n] matching the sources. "
        "If the papers don't cover it, say so. Be concise and specific."
    )
    prompt = f"""Question: {question}

Papers:
{_context(top)}

Answer with inline [n] citations."""
    answer = await llm.complete(prompt, system, max_tokens=900)
    return {"answer": answer, "sources": [_source(p, i) for i, p in enumerate(top, 1)]}


def _source(p: Paper, n: int) -> dict:
    return {
        "n": n,
        "title": p.title,
        "year": p.year,
        "venue": p.venue,
        "url": p.url,
        "citation_count": p.citation_count,
    }
