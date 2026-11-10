# Step 02 — Backend Setup

**Goal:** empty FastAPI app with uv — config, DB session, `/health` endpoint, CORS. No models yet.

**Prerequisite:** Step 01.

## Commands

```powershell
cd D:\code\yt_bot\backend
uv init --name ytbot-backend --python 3.12
del main.py
uv add fastapi "uvicorn[standard]" sqlalchemy asyncpg alembic pydantic-settings "pyjwt[crypto]" httpx openai pgvector youtube-transcript-api yt-dlp python-multipart
uv add --dev ruff pytest pytest-asyncio
```

## What to implement

- **`app/config.py`** — a `Settings` class extending `pydantic_settings.BaseSettings`, reading from `.env`. Fields: `database_url`, `cors_origins`, `openai_api_key`, `openai_chat_model`, `openai_embedding_model`, `supabase_url`, `supabase_anon_key`, `supabase_jwks_url`, `supabase_jwt_secret`. Use `extra="ignore"` so unknown env vars don't crash.
- **`app/db.py`** — async SQLAlchemy engine from `settings.database_url`, an `async_sessionmaker` with `expire_on_commit=False`, a `DeclarativeBase` subclass called `Base`, and a `get_session` async generator dependency.
- **`app/main.py`** — create the FastAPI app, add `CORSMiddleware` with origins split from `settings.cors_origins` (comma-separated, never `*` with credentials), and a `GET /health` returning `{"status": "ok"}`.
- Create `app/__init__.py` and `tests/__init__.py` (empty).
- **`tests/conftest.py`** — the shared test setup used by every later step. Keep tests in `backend/tests/`, never in scratch files outside the project, so they run with the project's own dependencies via `uv run pytest`:
  - `client` — `httpx.AsyncClient` over `ASGITransport(app=app)`.
  - `db_session` — opens a transaction, yields a session, and rolls back afterwards so tests never leave rows behind.
  - `[tool.pytest.ini_options]` with `asyncio_mode = "auto"`, `asyncio_default_fixture_loop_scope = "session"`, and `asyncio_default_test_loop_scope = "session"`. The session loop scope matters on Windows: without it each test gets a fresh event loop and the shared engine pool fails with `Event loop is closed`.
- Create a `backend/.env` with at minimum `DATABASE_URL` and `CORS_ORIGINS` (see step 10 for the full template).

## How to test

- Run `uv run uvicorn app.main:app --reload --port 8000`.
- `http://localhost:8000/health` → `{"status":"ok"}`.
- `http://localhost:8000/docs` → Swagger UI loads with one endpoint.
- `uv run python -c "from app.config import settings; print(settings.database_url)"` → prints the value from `.env`.
- `tests/test_health.py` — `GET /health` returns **200** and `{"status": "ok"}` through the `client` fixture.
- `uv run pytest` from `backend/` → the whole suite passes. Every later step adds its tests to this same folder.
