"""Analysis agents that reason over discovered papers using the LLM.

Agents: Literature Review (2), Research Gap (8), Proposal Writing (9).
All degrade gracefully to structured heuristic output without an LLM key.
"""
from __future__ import annotations


from app.schemas import (
    LiteratureReview,
    Paper,
    Proposal,
    ResearchGapResult,
)
from app.services.llm import get_llm


def _papers_context(papers: list[Paper], n: int = 12) -> str:
    lines = []
    for i, p in enumerate(papers[:n], 1):
        lines.append(
            f"[{i}] {p.title} ({p.year or 'n.d.'}, {p.venue or '?'}, "
            f"{p.citation_count or 0} cites)\nAbstract: {(p.abstract or '')[:600]}"
        )
    return "\n\n".join(lines)


# ---------- Agent 2: Literature Review ----------
async def literature_review_agent(
    query: str, papers: list[Paper]
) -> LiteratureReview:
    llm = get_llm()
    if not papers:
        return LiteratureReview(summary="No papers found to review.")
    context = _papers_context(papers)
    if not llm.available:
        return _heuristic_review(query, papers)

    system = (
        "You are a senior researcher writing a rigorous, citation-grounded "
        "literature review. Use only the provided papers. Reference them as [n]."
    )
    prompt = f"""Topic: {query}

Papers:
{context}

Produce a JSON object with keys:
- summary: 2-3 paragraph survey-style synthesis (string)
- methodologies: list of common methodologies observed
- research_gaps: list of concrete gaps
- strengths: list of strengths across the literature
- weaknesses: list of weaknesses/limitations
- future_directions: list of future directions
- comparison_table: list of objects, each {{"paper":..., "approach":..., "dataset":..., "metric":..., "limitation":...}}
"""
    data = await llm.complete_json(prompt, system, max_tokens=2000)
    if not data:
        return _heuristic_review(query, papers)
    return LiteratureReview(
        summary=data.get("summary", ""),
        methodologies=data.get("methodologies", []),
        research_gaps=data.get("research_gaps", []),
        strengths=data.get("strengths", []),
        weaknesses=data.get("weaknesses", []),
        future_directions=data.get("future_directions", []),
        comparison_table=data.get("comparison_table", []),
    )


def _heuristic_review(query: str, papers: list[Paper]) -> LiteratureReview:
    venues = sorted({p.venue for p in papers if p.venue})
    years = sorted({p.year for p in papers if p.year})
    table = [
        {
            "paper": p.title[:70],
            "year": p.year,
            "venue": p.venue,
            "citations": p.citation_count,
        }
        for p in papers[:10]
    ]
    span = f"{years[0]}–{years[-1]}" if years else "various years"
    return LiteratureReview(
        summary=(
            f"This review covers {len(papers)} papers on '{query}', spanning "
            f"{span} across venues including {', '.join(venues[:5]) or 'multiple sources'}. "
            "The most cited works anchor the field; recent papers indicate active "
            "development. (Configure an LLM key for a full narrative synthesis.)"
        ),
        methodologies=["See comparison table — extracted from abstracts"],
        research_gaps=[
            "Limited cross-dataset evaluation",
            "Few reproducibility studies",
        ],
        strengths=["Strong empirical results in top venues"],
        weaknesses=["Heterogeneous evaluation metrics across papers"],
        future_directions=["Unified benchmarks", "Real-world deployment studies"],
        comparison_table=table,
    )


# ---------- Agent 8: Research Gap ----------
async def research_gap_agent(
    query: str, papers: list[Paper]
) -> ResearchGapResult:
    llm = get_llm()
    if not papers:
        return ResearchGapResult()
    if not llm.available:
        return ResearchGapResult(
            opportunities=[
                {
                    "title": f"Under-explored evaluation settings in {query}",
                    "rationale": "Few papers report cross-domain generalization.",
                    "publication_potential": 4,
                },
                {
                    "title": f"Missing public datasets for {query}",
                    "rationale": "Several papers rely on private data.",
                    "publication_potential": 4,
                },
            ],
            thesis_topics=[
                f"A reproducible benchmark for {query}",
                f"Robustness analysis of {query} methods under distribution shift",
            ],
        )
    context = _papers_context(papers, 12)
    system = "You are a research strategist identifying high-value, novel gaps."
    prompt = f"""Topic: {query}

Recent literature:
{context}

Return JSON:
- opportunities: list of {{"title":..., "rationale":..., "publication_potential": 1-5}}
- thesis_topics: list of concrete, novel PhD/thesis topic titles
Rank opportunities by novelty x feasibility.
"""
    data = await llm.complete_json(prompt, system, max_tokens=1500)
    return ResearchGapResult(
        opportunities=data.get("opportunities", []),
        thesis_topics=data.get("thesis_topics", []),
    )


# ---------- Agent 9: Proposal Writing ----------
async def proposal_agent(
    topic: str, papers: list[Paper] | None = None, profile: str = ""
) -> Proposal:
    llm = get_llm()
    context = _papers_context(papers or [], 8) if papers else "(no papers attached)"
    if not llm.available:
        return Proposal(
            title=f"A Research Proposal on {topic}",
            problem_statement=(
                f"Despite progress in {topic}, key challenges remain in robustness, "
                "scalability, and real-world evaluation. (Configure an LLM key for a "
                "fully-written proposal.)"
            ),
            objectives=[
                f"Develop a novel approach to {topic}",
                "Build a reproducible benchmark",
                "Validate on real-world data",
            ],
            methodology=(
                "1) Literature consolidation. 2) Method design. 3) Implementation. "
                "4) Evaluation against baselines. 5) Ablations and analysis."
            ),
            expected_outcomes=(
                "A working system, an open benchmark, and 1–2 publications at top venues."
            ),
            budget=[
                {"item": "PhD/RA stipend (2 yrs)", "cost": "₹12,00,000"},
                {"item": "Compute / GPU credits", "cost": "₹4,00,000"},
                {"item": "Travel & dissemination", "cost": "₹2,00,000"},
            ],
        )
    system = "You are a grant-winning PI writing a concise, fundable proposal."
    prompt = f"""Write a research proposal on: {topic}
Researcher profile: {profile or 'general academic researcher'}
Grounding literature:
{context}

Return JSON with keys: title, problem_statement, objectives (list),
methodology (string with numbered phases), expected_outcomes (string),
budget (list of {{"item":..., "cost":...}}).
"""
    data = await llm.complete_json(prompt, system, max_tokens=2000)
    if not data.get("title"):
        data["title"] = f"A Research Proposal on {topic}"
    return Proposal(
        title=data.get("title"),
        problem_statement=data.get("problem_statement", ""),
        objectives=data.get("objectives", []),
        methodology=data.get("methodology", ""),
        expected_outcomes=data.get("expected_outcomes", ""),
        budget=data.get("budget", []),
    )
