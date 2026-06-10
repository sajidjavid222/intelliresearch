# ResearchPilot 🛰️

A multi-agent autonomous **research assistant** for academic researchers,
professors, PhD scholars, and students. Ask in plain English; ten specialized
agents fan out across academic sources and bring back **papers, datasets,
grants, conferences, patents, open-source code, and collaborators** — then
synthesize a literature review and identify research gaps.

> Built to run **with zero configuration** (SQLite + key-free public APIs), and
> to scale to production (PostgreSQL, Redis/Celery, Qdrant, LLMs) by adding env
> vars. Every external call degrades gracefully — no key, no crash.

---

## ✨ What's implemented

### The 10 agents
| # | Agent | Live sources | Status |
|---|-------|--------------|--------|
| 1 | **Paper Discovery** | arXiv, Semantic Scholar, OpenAlex, Crossref | ✅ live |
| 2 | **Literature Review** | LLM over discovered papers | ✅ (LLM optional) |
| 3 | **Dataset Discovery** | Hugging Face, OpenML, Papers With Code | ✅ live |
| 4 | **Grant Discovery** | NSF API + curated ANRF/DST/CSIR/DBT/DRDO/ISRO/Google/MS/Horizon feed | ✅ live + curated |
| 5 | **Conference / CFP** | Curated CORE-ranked CFP feed (IEEE/ACM/USENIX/…) | ✅ curated |
| 6 | **Open-Source Code** | GitHub, Papers With Code | ✅ live |
| 7 | **Patent Intelligence** | Google Patents (key-free), USPTO PatentsView (keyed) | ✅ live |
| 8 | **Research Gap** | LLM over the literature | ✅ (LLM optional) |
| 9 | **Proposal Writing** | LLM → Markdown / DOCX / PDF | ✅ (LLM optional) |
| 10 | **Collaboration** | OpenAlex authors + citation networks | ✅ live |

### Platform features
- **Semantic search** — an orchestrator parses intent and auto-selects agents.
- **Ranking** — relevance + citations + recency + influence; **seminal-paper** detection.
- **Research dashboard** — saved papers/datasets/grants, saved searches, reading history.
- **Automated monitoring** — subscribe to topics, get **alerts** for new papers/grants/datasets/CFPs.
- **Knowledge graph** endpoint for **citation-network visualization**.
- **Exports** — BibTeX, and proposals to Markdown/DOCX/PDF.
- **Auth** — email/password (JWT); Google OAuth scaffold.

---

## 🧱 Tech stack
- **Frontend:** Next.js 14 (App Router) · TypeScript · TailwindCSS
- **Backend:** FastAPI · Python · async SQLAlchemy
- **Agents:** LangGraph-style asyncio supervisor (no extra deps required)
- **LLMs:** Anthropic Claude / OpenAI GPT (optional) with heuristic fallback
- **DB:** SQLite by default · PostgreSQL in production
- **Optional infra:** Redis + Celery (monitoring), Qdrant (vectors), S3 storage

---

## 🚀 Quick start (no Docker, no keys)

### 1. Backend
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # optional — defaults work
uvicorn app.main:app --reload   # http://localhost:8000  (docs at /docs)
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev                     # http://localhost:3000
```

Open **http://localhost:3000** and try:
> *"Find recent papers on indoor Wi-Fi localization using drones"*

The frontend proxies `/api/*` to the backend (see `next.config.mjs`).

---

## 🐳 Run with Docker (full stack: Postgres + Redis + Qdrant)
```bash
docker compose up --build
# frontend → http://localhost:3000   backend → http://localhost:8000
```

---

## 🔑 Optional configuration (`backend/.env`)
Everything works without these, but they unlock more:

| Variable | Effect |
|----------|--------|
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | AI literature reviews, gap analysis, proposals |
| `GITHUB_TOKEN` | Higher GitHub rate limits |
| `SEMANTIC_SCHOLAR_API_KEY` | Higher Semantic Scholar limits |
| `DATABASE_URL` | Switch to PostgreSQL |
| `GOOGLE_CLIENT_ID/SECRET` | Google OAuth login |

---

## 📡 Key API endpoints
```
POST /api/search                  # orchestrated multi-agent semantic search
GET  /api/search/papers?q=...     # individual agents
GET  /api/search/datasets|code|patents|conferences|grants|collaborators?q=...
POST /api/search/literature-review
POST /api/search/research-gaps
POST /api/search/proposal?topic=...
GET  /api/export/bibtex?q=...
GET  /api/export/proposal?topic=...&fmt=md|docx|pdf
GET  /api/monitoring/graph?q=...  # citation-network nodes/links
POST /api/monitoring/run          # trigger subscription alerts
POST /api/auth/register | /api/auth/login
GET/POST /api/dashboard/items|searches|subscriptions|alerts|history
```
Interactive docs: **http://localhost:8000/docs**

---

## 📁 Project layout
```
backend/
  app/
    main.py              # FastAPI app + router wiring
    agents/              # orchestrator, discovery, analysis, ranking
    connectors/          # arXiv, S2, OpenAlex, HF, GitHub, patents, grants…
    api/routes/          # auth, search, dashboard, export, monitoring
    services/            # llm, export (bibtex/docx/pdf), monitoring
    db/                  # SQLAlchemy models + async engine
    worker.py            # optional Celery beat for scheduled monitoring
frontend/
  app/                   # /, /login, /dashboard (App Router)
  components/            # Nav, result Cards, AnalysisPanels
  lib/                   # api client + types
docker-compose.yml
```

---

## ⚖️ Notes on data sources
- Sources with **open APIs** are queried **live** (arXiv, Semantic Scholar,
  OpenAlex, Crossref, Hugging Face, OpenML, Papers With Code, GitHub, Google
  Patents, NSF). OpenAlex/Semantic Scholar **index IEEE, ACM, Springer,
  Elsevier, Nature** and more, so those publishers are covered transitively.
- **Conferences** and most **grants** have no unified free API; ResearchPilot
  ships a curated, ranked seed feed and filters it by your query/profile. Point
  `CONF_FEED_URL` at a live ccfddl-style feed in production.
- Respect each provider's terms and rate limits in production deployments.
```
```
