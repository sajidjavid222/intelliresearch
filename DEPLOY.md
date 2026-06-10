# Deploying IntelliResearch to Render

This deploys three things from one repo: a **Postgres** database, the **FastAPI
backend**, and the **Next.js frontend** — defined in [`render.yaml`](render.yaml).

> You'll need: a **GitHub** account and a free **Render** account
> (https://render.com). Your **Gemini API key** is set in Render's dashboard,
> never committed to git.

---

## 1. Push the code to GitHub

From the project folder:

```bash
cd ~/Desktop/New_Project
# (a clean git repo has already been initialized for you — see below)
git remote add origin https://github.com/<your-username>/intelliresearch.git
git branch -M main
git push -u origin main
```

If you don't have the repo on GitHub yet: go to https://github.com/new, create
an empty repo named `intelliresearch` (no README), then run the commands above.

---

## 2. Create the Render Blueprint

1. Go to **https://dashboard.render.com** → **New +** → **Blueprint**.
2. Connect your GitHub and pick the `intelliresearch` repo.
3. Render reads `render.yaml` and shows 3 resources (db, backend, frontend).
   Click **Apply**. The database + both services start building.

The first build takes a few minutes (it builds both Docker images).

---

## 3. Set the secret / URL env vars

A few values are intentionally **not** in git. After the first deploy:

### Backend service → **Environment**
| Key | Value |
|-----|-------|
| `GEMINI_API_KEY` | your key from https://aistudio.google.com/apikey |
| `GOOGLE_CLIENT_ID` | *(optional)* your Google OAuth client ID |
| `FRONTEND_ORIGIN` | the **frontend** URL, e.g. `https://intelliresearch-frontend.onrender.com` |

`DATABASE_URL` and `SECRET_KEY` are wired automatically by the blueprint.

### Frontend service → **Environment**
| Key | Value |
|-----|-------|
| `BACKEND_URL` | the **backend** URL, e.g. `https://intelliresearch-backend.onrender.com` |

After setting these, click **Manual Deploy → Deploy latest commit** on each
service (or just **Save** — Render redeploys on env changes).

---

## 4. (Optional) Enable Google Sign-In in production

In **Google Cloud Console → Credentials → your OAuth client**:
- **Authorized JavaScript origins** → add your frontend URL
  (`https://intelliresearch-frontend.onrender.com`).
- Save (can take a few minutes to propagate).

Then make sure `GOOGLE_CLIENT_ID` is set on the **backend** service (step 3).

---

## 5. Verify

- Backend health: `https://<backend>.onrender.com/api/health`
  → should show `{"status":"ok","app":"IntelliResearch",...}`
- Frontend: open `https://<frontend>.onrender.com` and run a search.

---

## Notes & gotchas

- **Free tier sleeps.** Free Render services spin down after ~15 min idle; the
  first request after that has a cold start (~30–60s). Upgrade the service plan
  to keep it always-on.
- **Free Postgres expires after 90 days.** Fine for a demo; upgrade for real use.
- **Gemini free-tier quota** is limited (see the in-app fallback). For heavy use,
  enable billing on your Google AI project.
- **Redis is optional.** Without it, the app uses an in-memory cache — perfect
  for a single instance. Add a Render Redis and set `REDIS_URL` to scale out.
- **Changing the frontend/backend URLs?** Update `FRONTEND_ORIGIN` and
  `BACKEND_URL` to match, then redeploy.

---

## Alternative: one-box Docker (any VPS / Fly.io)

Everything also runs via the included `docker-compose.yml`:

```bash
# set GEMINI_API_KEY (and others) in your shell or an env file first
docker compose up --build
```

This brings up Postgres + Redis + backend + frontend together on one machine.
