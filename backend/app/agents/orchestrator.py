"""Orchestrator: parses intent from a natural-language query and fans out to
the relevant agents concurrently, then assembles a unified SearchResponse.

This is the LangGraph-style supervisor. We implement the routing/state machine
directly with asyncio so it runs with zero extra dependencies; the structure
maps 1:1 onto LangGraph nodes if you later adopt it.
"""
from __future__ import annotations

import asyncio
import time

from app.agents import analysis, discovery
from app.schemas import SearchRequest, SearchResponse
from app.services.llm import get_llm

ALL_AGENTS = [
    "papers",
    "datasets",
    "code",
    "patents",
    "conferences",
    "grants",
    "collaborators",
    "literature_review",
    "research_gaps",
]

# Papers are the backbone, so we pull a deep pool (deduped across ~8 sources)
# and let the frontend paginate through it. Other categories stay at req.limit.
PAPERS_POOL = 45

# Keyword cues for cheap, no-LLM intent routing.
_CUES = {
    "datasets": ["dataset", "data set", "benchmark", "corpus", "training data"],
    "code": ["code", "implementation", "github", "repo", "reproduce", "open source"],
    "patents": ["patent", "invention", "ip ", "intellectual property"],
    "conferences": ["conference", "cfp", "call for papers", "deadline", "submit", "venue"],
    "grants": ["grant", "funding", "fund", "fellowship", "proposal", "money", "scholarship"],
    "collaborators": ["collaborator", "researcher", "professor", "lab ", "co-author", "expert"],
    "literature_review": ["review", "survey", "literature", "state of the art", "overview"],
    "research_gaps": ["gap", "opportunity", "thesis topic", "open problem", "future work"],
}


# Words that only signal routing intent, not the actual search topic. Stripped
# from the topic so connectors search the real subject, not meta-words.
_STOPWORDS = {
    "find", "search", "recent", "latest", "papers", "paper", "dataset",
    "datasets", "code", "implementation", "implementations", "github", "repo",
    "repos", "grant", "grants", "funding", "conference", "conferences", "cfp",
    "patent", "patents", "collaborator", "collaborators", "review", "survey",
    "literature", "and", "with", "using", "for", "the", "of", "on", "a", "to",
    "show", "me", "about", "gap", "gaps",
}


def _clean_topic(query: str) -> str:
    words = [w for w in query.split() if w.lower().strip(".,") not in _STOPWORDS]
    cleaned = " ".join(words).strip()
    return cleaned or query  # never return empty


async def _llm_intent(query: str) -> dict | None:
    llm = get_llm()
    if not llm.available:
        return None
    system = "You route research queries to specialized agents."
    prompt = f"""User query: "{query}"

Available agents: {", ".join(ALL_AGENTS)}.
'papers' should almost always run. Return JSON:
{{"agents": [list of agent names to run], "topic": "cleaned search topic",
"reasoning": "one sentence"}}"""
    data = await llm.complete_json(prompt, system, max_tokens=300)
    if data and data.get("agents"):
        data["agents"] = [a for a in data["agents"] if a in ALL_AGENTS]
        return data
    return None


def _heuristic_intent(query: str) -> dict:
    q = query.lower()
    agents = {"papers"}  # papers always run as the backbone
    for agent, cues in _CUES.items():
        if any(c in q for c in cues):
            agents.add(agent)
    # If query looks broad/exploratory, add datasets + code too.
    if len(agents) == 1:
        agents.update({"datasets", "code"})
    # Literature review + gaps are cheap and high-value whenever papers run.
    agents.update({"literature_review", "research_gaps"})
    return {
        "agents": [a for a in ALL_AGENTS if a in agents],
        "topic": _clean_topic(query),
        "reasoning": "Heuristic keyword routing (no LLM configured).",
    }


async def run_search(req: SearchRequest, profile: str = "") -> SearchResponse:
    t0 = time.time()

    if req.agents:
        intent = {"agents": [a for a in req.agents if a in ALL_AGENTS], "topic": req.query}
    else:
        intent = await _llm_intent(req.query) or _heuristic_intent(req.query)

    selected = intent["agents"] or ["papers"]
    topic = intent.get("topic", req.query)
    resp = SearchResponse(query=req.query, intent=intent, agents_run=selected)

    # Phase 1: discovery agents run concurrently.
    tasks: dict[str, asyncio.Task] = {}
    if "papers" in selected:
        tasks["papers"] = asyncio.create_task(
            discovery.paper_discovery_agent(topic, max(req.limit, PAPERS_POOL))
        )
    if "datasets" in selected:
        tasks["datasets"] = asyncio.create_task(
            discovery.dataset_discovery_agent(topic, req.limit)
        )
    if "code" in selected:
        tasks["code"] = asyncio.create_task(
            discovery.code_discovery_agent(topic, req.limit)
        )
    if "patents" in selected:
        tasks["patents"] = asyncio.create_task(discovery.patent_agent(topic, 10))
    if "conferences" in selected:
        tasks["conferences"] = asyncio.create_task(
            discovery.conference_agent(topic, 10)
        )
    if "grants" in selected:
        tasks["grants"] = asyncio.create_task(
            discovery.grant_agent(topic, profile, 12)
        )
    if "collaborators" in selected:
        tasks["collaborators"] = asyncio.create_task(
            discovery.collaboration_agent(topic, 10)
        )

    # Agent keys map 1:1 to SearchResponse fields except "code" -> repositories.
    field_for = {"code": "repositories"}
    for name, task in tasks.items():
        field = field_for.get(name, name)
        try:
            setattr(resp, field, await task)
        except Exception:
            setattr(resp, field, [])

    # Phase 2: analysis agents depend on papers.
    if resp.papers:
        analysis_tasks = []
        if "literature_review" in selected:
            analysis_tasks.append(
                ("literature_review", analysis.literature_review_agent(topic, resp.papers))
            )
        if "research_gaps" in selected:
            analysis_tasks.append(
                ("research_gaps", analysis.research_gap_agent(topic, resp.papers))
            )
        for name, coro in analysis_tasks:
            try:
                setattr(resp, name, await coro)
            except Exception:
                pass

    resp.elapsed_ms = int((time.time() - t0) * 1000)
    return resp
