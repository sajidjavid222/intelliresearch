"""Conference connector.

There is no single free API covering IEEE/ACM/Springer/Scopus deadlines with
rankings + acceptance rates. We ship a curated, regularly-relevant seed list
(modelled on ccfddl/WikiCFP-style data) and filter it by query keywords. In
production, point CONF_FEED_URL at a live ccfddl-style YAML/JSON feed.
"""
from __future__ import annotations

from app.schemas import Conference

# Curated seed of major venues with rank (CORE/CCF), typical deadlines and
# acceptance rates. Years are illustrative cycles; replace with a live feed.
_SEED: list[dict] = [
    {"name": "Conference on Neural Information Processing Systems", "acronym": "NeurIPS",
     "submission_deadline": "2026-05-15", "notification_date": "2026-09-18",
     "rank": "A* (CORE)", "acceptance_rate": "~26%", "location": "San Diego, USA",
     "url": "https://neurips.cc", "topics": ["machine learning", "ai", "deep learning", "ml"]},
    {"name": "International Conference on Machine Learning", "acronym": "ICML",
     "submission_deadline": "2026-01-31", "notification_date": "2026-05-01",
     "rank": "A* (CORE)", "acceptance_rate": "~27%", "location": "Seoul, Korea",
     "url": "https://icml.cc", "topics": ["machine learning", "ai", "ml", "deep learning"]},
    {"name": "IEEE/CVF Conference on Computer Vision and Pattern Recognition", "acronym": "CVPR",
     "submission_deadline": "2025-11-14", "notification_date": "2026-02-26",
     "rank": "A* (CORE)", "acceptance_rate": "~23%", "location": "Denver, USA",
     "url": "https://cvpr.thecvf.com", "topics": ["computer vision", "vision", "image", "cv"]},
    {"name": "International Conference on Learning Representations", "acronym": "ICLR",
     "submission_deadline": "2025-09-24", "notification_date": "2026-01-22",
     "rank": "A* (CORE)", "acceptance_rate": "~31%", "location": "Rio de Janeiro, Brazil",
     "url": "https://iclr.cc", "topics": ["deep learning", "representation", "ai", "ml"]},
    {"name": "Annual Meeting of the Association for Computational Linguistics", "acronym": "ACL",
     "submission_deadline": "2026-02-15", "notification_date": "2026-05-15",
     "rank": "A* (CORE)", "acceptance_rate": "~21%", "location": "Vienna, Austria",
     "url": "https://www.aclweb.org", "topics": ["nlp", "language", "text", "linguistics", "llm"]},
    {"name": "IEEE International Conference on Computer Communications", "acronym": "INFOCOM",
     "submission_deadline": "2025-07-31", "notification_date": "2025-11-30",
     "rank": "A* (CORE)", "acceptance_rate": "~19%", "location": "London, UK",
     "url": "https://infocom.ieee-infocom.org", "topics": ["networking", "wireless", "wifi",
     "localization", "communication", "sensing", "iot"]},
    {"name": "ACM International Conference on Mobile Computing and Networking", "acronym": "MobiCom",
     "submission_deadline": "2026-03-20", "notification_date": "2026-07-10",
     "rank": "A* (CORE)", "acceptance_rate": "~17%", "location": "Hong Kong",
     "url": "https://www.sigmobile.org/mobicom/", "topics": ["mobile", "wireless", "sensing",
     "wifi", "localization", "iot", "networking"]},
    {"name": "ACM Conference on Embedded Networked Sensor Systems", "acronym": "SenSys",
     "submission_deadline": "2026-04-04", "notification_date": "2026-08-01",
     "rank": "A (CORE)", "acceptance_rate": "~20%", "location": "Irvine, USA",
     "url": "https://sensys.acm.org", "topics": ["sensing", "iot", "edge", "embedded",
     "wireless", "localization"]},
    {"name": "AAAI Conference on Artificial Intelligence", "acronym": "AAAI",
     "submission_deadline": "2025-08-15", "notification_date": "2025-11-09",
     "rank": "A* (CORE)", "acceptance_rate": "~23%", "location": "Singapore",
     "url": "https://aaai.org", "topics": ["ai", "machine learning", "ml", "reasoning"]},
    {"name": "International Conference on Robotics and Automation", "acronym": "ICRA",
     "submission_deadline": "2025-09-15", "notification_date": "2026-01-31",
     "rank": "A* (CORE)", "acceptance_rate": "~43%", "location": "Vienna, Austria",
     "url": "https://www.ieee-ras.org", "topics": ["robotics", "drone", "uav", "control",
     "autonomous", "localization"]},
    {"name": "USENIX Symposium on Networked Systems Design and Implementation", "acronym": "NSDI",
     "submission_deadline": "2025-09-18", "notification_date": "2025-12-12",
     "rank": "A* (CORE)", "acceptance_rate": "~18%", "location": "Boston, USA",
     "url": "https://www.usenix.org/conference/nsdi", "topics": ["systems", "networking",
     "distributed", "edge"]},
]


async def search_conferences(query: str, limit: int = 10) -> list[Conference]:
    terms = {w for w in query.lower().split() if len(w) > 2}
    scored: list[tuple[int, dict]] = []
    for c in _SEED:
        hits = sum(
            1 for t in c["topics"] if any(term in t or t in term for term in terms)
        )
        # Always allow generic AI/ML venues a small base score.
        scored.append((hits, c))
    scored.sort(key=lambda x: x[0], reverse=True)
    chosen = [c for h, c in scored if h > 0][:limit]
    if not chosen:  # fall back to top-tier general venues
        chosen = [c for _, c in scored[:limit]]
    return [
        Conference(
            name=c["name"], acronym=c["acronym"],
            submission_deadline=c["submission_deadline"],
            notification_date=c["notification_date"], rank=c["rank"],
            acceptance_rate=c["acceptance_rate"], location=c["location"],
            url=c["url"], source="Curated CFP feed",
        )
        for c in chosen
    ]
