# Step 10 — Env & Config

**Goal:** all environment files and gitignore in one place. Fill these in as you complete each step. No docker-compose — the database is hosted by an external provider.

## `backend/.env`

- `DATABASE_URL` — your external Postgres URL with `?sslmode=require`. Supabase session pooler example: `postgresql+asyncpg://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require`. Start on port 5432 (session); port 6543 (transaction) needs `statement_cache_size=0` in asyncpg's `connect_args`.
- `SUPABASE_URL` — project URL
- `SUPABASE_ANON_KEY` — public anon key
- `SUPABASE_JWKS_URL` — `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json` (new projects, asymmetric keys)
- `SUPABASE_JWT_SECRET` — Auth → JWT Settings (legacy HS256). Use one of JWKS or secret, not both.
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

## `.gitignore` (project root)

Must include: `__pycache__/`, `.venv/`, `.ruff_cache/`, `.pytest_cache/`, `backend/.env`, `frontend/.env.local`, `node_modules/`, `dist/`, `.vite/`, `.DS_Store`, `Thumbs.db`. No secrets should ever appear in `git status`.

## `backend/pyproject.toml`

Managed by `uv add` — don't hand-edit dependencies. After steps 02–06 it should contain: fastapi, uvicorn, sqlalchemy, asyncpg, psycopg2-binary, alembic, pydantic-settings, pyjwt, httpx, openai, pgvector, youtube-transcript-api, yt-dlp, python-multipart. Dev: ruff, pytest, pytest-asyncio. Add `[tool.pytest.ini_options]` with `asyncio_mode = "auto"`.

## Tests

- All tests live in `backend/tests/`. Don't create throwaway scripts outside the project — one command, `uv run pytest`, runs everything.
- `tests/conftest.py` holds the shared fixtures: `client` (`httpx.AsyncClient` over `ASGITransport`), `db_session` (a transaction that always rolls back, so the suite leaves no rows behind), and seeded-user helpers.
- `[tool.pytest.ini_options]` sets `asyncio_mode = "auto"`, `asyncio_default_fixture_loop_scope = "session"`, and `asyncio_default_test_loop_scope = "session"` — one loop per run so the shared async engine keeps working, and no `@pytest.mark.asyncio` needed.
- Tests that need the network or OpenAI are marked `@pytest.mark.network` / `@pytest.mark.openai` and skipped unless the matching env var is set, so the default run is offline and fast.

## How to test

- `uv run pytest` → green from a clean checkout, with no leftover rows in the database.
- Backend reads the external DB: `uv run python -c "from app.config import settings; print(settings.database_url)"` prints the URL, then `uv run alembic current` connects over SSL without error.
- Frontend: `npm run build` → no "VITE_ is undefined" warnings.
- `git status` → no `.env`, `.venv`, or `node_modules` listed.
