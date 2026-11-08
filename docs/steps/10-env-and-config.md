# Step 10 — Env & Config

**Goal:** all environment files, docker-compose, and gitignore in one place. Fill these in as you complete each step.

## `backend/.env`

Variables needed (fill values from your Supabase dashboard and OpenAI):

- `DATABASE_URL` — `postgresql+asyncpg://postgres:postgres@localhost:5432/ytbot`
- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_ANON_KEY` — public anon key
- `SUPABASE_JWKS_URL` — `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json` (new projects, asymmetric keys)
- `SUPABASE_JWT_SECRET` — from Auth → JWT Settings (legacy HS256 projects). Use one of JWKS or secret, not both.
- `OPENAI_API_KEY`
- `OPENAI_CHAT_MODEL` — `gpt-4o-mini`
- `OPENAI_EMBEDDING_MODEL` — `text-embedding-3-small`
- `CORS_ORIGINS` — `http://localhost:5173`
- `YT_PROXY_URL` — optional, for production YouTube access

## `frontend/.env.local`

- `VITE_API_URL` — `http://localhost:8000`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Vite inlines `VITE_*` at **build time**. A runtime `.env` does nothing for a production build — set these as build args when deploying.

## `docker-compose.yml`

A single service: `pgvector/pgvector:pg16` on port 5432, with `POSTGRES_PASSWORD`, `POSTGRES_DB=ytbot`, a named volume `ytbot_pgdata`, and a healthcheck (`pg_isready`). Backend and frontend run from their own terminals in dev — don't containerize them until you deploy.

## `.gitignore` (project root)

Must include: `__pycache__/`, `.venv/`, `.ruff_cache/`, `.pytest_cache/`, `backend/.env`, `frontend/.env.local`, `node_modules/`, `dist/`, `.vite/`, `ytbot_pgdata/`, `.DS_Store`, `Thumbs.db`. No secrets should ever appear in `git status`.

## `backend/pyproject.toml`

Managed by `uv add` — don't hand-edit dependencies. After all `uv add` commands from steps 02–06, verify it contains: fastapi, uvicorn, sqlalchemy, asyncpg, psycopg2-binary, alembic, pydantic-settings, pyjwt, httpx, openai, pgvector, youtube-transcript-api, yt-dlp, python-multipart. Dev: ruff, pytest, pytest-asyncio. Add `[tool.pytest.ini_options]` with `asyncio_mode = "auto"`.

## How to test

- `docker compose up -d` → `docker compose ps` shows db healthy.
- Backend: `uv run python -c "from app.config import settings; print(settings.database_url)"` → prints the `.env` value.
- Frontend: `npm run build` → no "VITE_ is undefined" warnings.
- `git status` → no `.env`, `.venv`, or `node_modules` listed.
