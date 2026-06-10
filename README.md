<div align="center">

# 🛰️ IntelliResearch

### Your entire research team, in one search.

A multi-agent AI platform that discovers, analyzes, and organizes academic
research — papers, datasets, grants, conferences, patents, code, and
collaborators — then writes a cited literature review for you.

**[🚀 Live Demo →](https://intelliresearch-frontend.onrender.com)**

![Made with](https://img.shields.io/badge/made%20with-♥%20by%20Shah%20Sajid%20Naqshbandi-ec4899)
![Next.js](https://img.shields.io/badge/Next.js-14-000)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688)
![Gemini](https://img.shields.io/badge/AI-Gemini-4c66f5)
![Deploy](https://img.shields.io/badge/deployed-Render-46a3ff)

</div>

> **Note on the live demo:** it runs on a free tier that sleeps after ~15 min of
> inactivity, so the **first** request may take 30–60s to wake up. Then it's fast.

---

## 📸 Screenshots

<!--
  To add screenshots: save images into a `docs/` folder (e.g. docs/search.png)
  then uncomment the lines below. Tip: open the live demo, run a search, and
  screenshot the search page, the citation graph, and the dashboard.

![Search](docs/search.png)
![Citation graph](docs/graph.png)
![Dashboard](docs/dashboard.png)
-->

*Try it on the [live demo](https://intelliresearch-frontend.onrender.com) — search “diffusion models”, open the **Chat** tab, or visit the **Graph** page.*

---

## ✨ What it does

Ask a question in plain English. An **orchestrator** parses your intent and
dispatches **10 specialized agents** that fan out across academic sources,
rank what they find, and synthesize the results.

### The 10 agents
| Agent | Sources |
|-------|---------|
| 📄 **Paper Discovery** | arXiv · Semantic Scholar · OpenAlex · Crossref · PubMed · DOAJ · DBLP |
| 📚 **Literature Review** | Gemini, grounded in the discovered papers |
| 🗂️ **Dataset Discovery** | Hugging Face · OpenML · Papers With Code |
| 💸 **Grant Discovery** | NSF API + curated ANRF/DST/CSIR/DBT/DRDO/ISRO/Google/MS/Horizon feed |
| 🗓️ **Conference / CFP** | Curated CORE-ranked feed (IEEE/ACM/USENIX/…) |
| 💻 **Open-Source Code** | GitHub · Papers With Code (with reproducibility scoring) |
| 🛡️ **Patent Intelligence** | Google Patents · USPTO PatentsView |
| 🔍 **Research Gap** | Gemini analysis → ranked opportunities & thesis topics |
| 📝 **Proposal Writing** | Gemini → Markdown / DOCX / PDF |
| 🤝 **Collaboration** | OpenAlex authors & citation networks |

### Highlight features
- 💬 **Chat with your papers** — ask questions answered with inline citations (RAG).
- 🕸️ **Citation network graph** — interactive, zoomable, click-through author/paper map.
- 👤 **Author profiles** — h-index, citations, top papers & a disambiguation picker.
- 🌐 **Multi-language** — translate abstracts & reviews into 14 languages on demand.
- 📁 **Collections & notes** — organize saved items into folders, annotate them.
- ⚖️ **Compare papers** — side-by-side table of up to 4 papers.
- 🔔 **Topic monitoring** — subscribe to topics, get alerts for new results.
- 📤 **Exports** — BibTeX, RIS (Zotero/Mendeley), and proposals to DOCX/PDF.
- 🎛️ **Detailed filters**, ⌘K **command palette**, recent searches, dark mode, mobile-ready.

---

## 🧱 Tech stack

| Layer | Tech |
|-------|------|
| **Frontend** | Next.js 14 (App Router) · TypeScript · TailwindCSS |
| **Backend** | FastAPI · Python · async SQLAlchemy |
| **AI** | Google Gemini (with automatic model fallback) |
| **Database** | PostgreSQL (production) · SQLite (local, zero-config) |
| **Caching** | Redis when available, else in-process |
| **Auth** | JWT (email/password) + Google Sign-In |
| **Deploy** | Render (Docker) — see [`render.yaml`](render.yaml) |

Every external call **degrades gracefully** — missing keys or rate limits fall
back instead of crashing.

---

## 🚀 Run locally (zero config)

**Backend**
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # optional — works without keys
uvicorn app.main:app --reload # → http://localhost:8000  (docs at /docs)
```

**Frontend** (in a second terminal)
```bash
cd frontend
npm install
npm run dev                   # → http://localhost:3000
```

Open **http://localhost:3000** and search
*“indoor Wi-Fi localization using drones.”*

> Add `GEMINI_API_KEY` to `backend/.env` (free key at
> [aistudio.google.com/apikey](https://aistudio.google.com/apikey)) to unlock the
> AI features — chat, reviews, gaps, proposals, and translation.

---

## ☁️ Deploy

One-click-ish on Render via the included Blueprint — full guide in
**[DEPLOY.md](DEPLOY.md)**. Also runs anywhere with `docker compose up --build`.

---

## 📂 Project structure

```
backend/   FastAPI app — agents, connectors, API routes, services, db
frontend/  Next.js app — pages, components, lib
render.yaml   Render Blueprint (db + backend + frontend)
DEPLOY.md     Step-by-step deployment guide
```

---

<div align="center">

Made with ♥ by **Shah Sajid Naqshbandi**

*“Research is to see what everybody else has seen, and to think what nobody else has thought.”*

</div>
