"""Grant connector.

Indian agencies (ANRF/SERB, DST, CSIR, DBT, DRDO, ISRO) and international
funders (NSF, Google/Microsoft Research, Horizon Europe) do not expose a
unified open API. NSF has a live JSON API which we use; the rest are served
from a curated, frequently-recurring seed and filtered/scored against the
user's profile and query. Replace the seed with scraped feeds in production.
"""
from __future__ import annotations

from app.connectors.http import get_json
from app.schemas import Grant

_SEED: list[dict] = [
    {"title": "ANRF Mission Research Grants", "agency": "ANRF (India)",
     "eligibility": "Faculty at Indian institutions; PhD required",
     "amount": "Up to ₹2 Cr / 3 yrs", "deadline": "Rolling",
     "url": "https://anrfonline.in", "topics": ["ai", "ml", "engineering", "science"]},
    {"title": "SERB Core Research Grant (CRG)", "agency": "SERB / ANRF (India)",
     "eligibility": "Regular faculty, Indian academic institutions",
     "amount": "Up to ₹40 L + overhead", "deadline": "Annual call (Jul–Aug)",
     "url": "https://serbonline.in", "topics": ["science", "engineering", "ai", "ml", "physics"]},
    {"title": "DST ICPS — Interdisciplinary Cyber-Physical Systems", "agency": "DST (India)",
     "eligibility": "Indian researchers; CPS/AI/IoT focus",
     "amount": "Varies by call", "deadline": "Per call",
     "url": "https://dst.gov.in", "topics": ["iot", "cyber-physical", "ai", "robotics",
     "sensing", "edge", "localization"]},
    {"title": "DBT-BIRAC Biotechnology Research Grants", "agency": "DBT (India)",
     "eligibility": "Bio/health researchers in India",
     "amount": "Varies", "deadline": "Per call",
     "url": "https://dbtindia.gov.in", "topics": ["biology", "health", "bioinformatics", "medical"]},
    {"title": "CSIR Research Grants & Fellowships", "agency": "CSIR (India)",
     "eligibility": "Indian scientists / scholars",
     "amount": "Varies", "deadline": "Per scheme",
     "url": "https://csirhrdg.res.in", "topics": ["science", "chemistry", "engineering", "ai"]},
    {"title": "DRDO Extramural Research (ER&IPR)", "agency": "DRDO (India)",
     "eligibility": "Indian academic institutions; defence-relevant R&D",
     "amount": "Project-based", "deadline": "Rolling",
     "url": "https://drdo.gov.in", "topics": ["defence", "radar", "sensing", "ai",
     "wireless", "localization", "drone", "uav"]},
    {"title": "ISRO RESPOND Programme", "agency": "ISRO (India)",
     "eligibility": "Indian universities/institutions; space-relevant research",
     "amount": "Project-based", "deadline": "Per call",
     "url": "https://www.isro.gov.in/RespondProgramme.html",
     "topics": ["space", "remote sensing", "signal", "communication", "navigation", "gps"]},
    {"title": "NSF Computer and Information Science (CISE) Core", "agency": "NSF (USA)",
     "eligibility": "US institutions (intl. collaboration possible)",
     "amount": "$175k–$1.2M", "deadline": "Rolling / per program",
     "url": "https://www.nsf.gov/funding", "topics": ["ai", "ml", "systems", "networking",
     "vision", "nlp", "hci", "security"]},
    {"title": "Google Research Scholar Program", "agency": "Google Research",
     "eligibility": "Early-career faculty worldwide",
     "amount": "Up to $60k (unrestricted)", "deadline": "Annual (Q3)",
     "url": "https://research.google/programs-and-events/research-scholar-program/",
     "topics": ["ai", "ml", "nlp", "vision", "systems", "hci", "privacy"]},
    {"title": "Microsoft Research Faculty Fellowship / AI Grants", "agency": "Microsoft Research",
     "eligibility": "Faculty / researchers worldwide",
     "amount": "Azure credits + funding", "deadline": "Per call",
     "url": "https://www.microsoft.com/en-us/research/academic-program/",
     "topics": ["ai", "ml", "cloud", "systems", "nlp", "vision"]},
    {"title": "Horizon Europe — Cluster 4 (Digital, Industry, Space)", "agency": "European Commission",
     "eligibility": "EU + associated country consortia",
     "amount": "€1M–€10M+", "deadline": "Per topic call",
     "url": "https://ec.europa.eu/info/funding-tenders",
     "topics": ["ai", "digital", "space", "iot", "robotics", "edge", "6g", "wireless"]},
    {"title": "ERC Starting / Consolidator Grant", "agency": "European Research Council",
     "eligibility": "Researchers hosted at EU/associated institutions",
     "amount": "€1.5M–€2M", "deadline": "Annual",
     "url": "https://erc.europa.eu",
     "topics": ["frontier", "ai", "ml", "science", "engineering"]},
]


def _score(profile: str, query: str, topics: list[str]) -> float:
    text = f"{profile} {query}".lower()
    terms = {w for w in text.split() if len(w) > 2}
    hits = sum(1 for t in topics if any(term in t or t in term for term in terms))
    return round(min(hits / max(len(topics), 1) * 5 + (1.0 if hits else 0), 5.0), 1)


async def search_grants(
    query: str, profile: str = "", limit: int = 12
) -> list[Grant]:
    out: list[Grant] = []
    for g in _SEED:
        out.append(
            Grant(
                title=g["title"], agency=g["agency"], eligibility=g["eligibility"],
                amount=g["amount"], deadline=g["deadline"], url=g["url"],
                match_score=_score(profile, query, g["topics"]),
                source="Curated funding feed",
            )
        )
    # Try a few live NSF awards as a bonus, key-free.
    out.extend(await _nsf_live(query))
    out.sort(key=lambda x: x.match_score, reverse=True)
    return out[:limit]


async def _nsf_live(query: str) -> list[Grant]:
    url = "https://api.nsf.gov/services/v1/awards.json"
    params = {"keyword": query, "rpp": 5, "printFields": "title,agency,fundsObligatedAmt,startDate,id"}
    data = await get_json(url, params=params)
    if not data:
        return []
    awards = (data.get("response") or {}).get("award") or []
    out: list[Grant] = []
    for a in awards:
        amt = a.get("fundsObligatedAmt")
        out.append(
            Grant(
                title=a.get("title", "")[:160], agency="NSF (USA) — active award",
                eligibility="US institutions",
                amount=f"${amt}" if amt else None,
                deadline="See solicitation",
                url=f"https://www.nsf.gov/awardsearch/showAward?AWD_ID={a.get('id')}",
                match_score=3.0, source="NSF API",
            )
        )
    return out
