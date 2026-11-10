# Step 03 — Database Setup

**Goal:** provision Postgres + pgvector on an external provider, define all seven v1 models, create and apply the first Alembic migration.

**Prerequisite:** Step 02.

## Provision the database

Use an external Postgres — no local Docker. It's still plain Postgres, so pgvector, HNSW, and the `tsv` generated column behave exactly as they would locally. Only the connection string and pooler quirks change.

**Recommended: Supabase Postgres.** You already use Supabase for auth (step 04), so the JWT and the database share one project and one bill. Create the project, then enable pgvector in Database → Extensions (or run `create extension if not exists vector;` from the SQL editor).

**Alternative: Neon** — serverless Postgres with pgvector 0.7+, equally fine.

Copy the connection string from Settings → Database → Connection string:

- **Session pooler (port 5432)** — works with `asyncpg` unchanged. Start here.
- **Transaction pooler (port 6543)** — higher connection limit, but no prepared statements; `asyncpg` then needs `statement_cache_size=0` via `connect_args`.

Append `?sslmode=require` to the URL. Run Alembic over the session/direct connection, not the transaction pooler — DDL and advisory locks misbehave through a transaction pooler.

## Commands

```powershell
cd D:\code\yt_bot\backend
uv add psycopg2-binary
uv run alembic init alembic
```

## What to implement

- **`app/models.py`** — define all seven tables as SQLAlchemy 2.0 declarative models on `Base`:
  - `AppUser` — `id`, `supabase_id` (unique), `email`, `display_name`, `avatar_url`, `created_at`.
  - `Playlist` — `user_id` FK, `youtube_playlist_id`, `title`, `item_count`. Unique on `(user_id, youtube_playlist_id)`.
  - `Video` — `user_id`, `playlist_id` (nullable), `youtube_video_id`, `title`, `channel`, `duration_s`, `thumbnail_url`, `status` (default `queued`), `error`, `transcript_source`, `language`, `full_text`, `segments` (JSONB). Unique on `(user_id, youtube_video_id)`.
  - `Chunk` — `video_id`, `user_id`, `playlist_id` (both denormalized), `chunk_index`, `text`, `start_s`, `end_s`, `token_count`, `content_hash`, `embedding_model`, `embedding` as `Vector(1536)`. Unique on `(video_id, chunk_index)`. HNSW index on `embedding` with `vector_cosine_ops`. B-tree indexes on `user_id`, `video_id`, `playlist_id`.
  - `IngestJob` — `user_id`, `kind`, `target`, `total`, `done`, `status`, `error`.
  - `Chat` — `user_id`, `video_id`, `playlist_id`, `title`.
  - `Message` — `chat_id`, `role`, `content`, `citations` (JSONB). Index on `(chat_id, id)`.
  - All FKs use `ON DELETE CASCADE` down the chain.
- **Alembic `env.py`** — import `Base.metadata` and all models, set the URL to a sync variant (`+psycopg` instead of `+asyncpg`) and keep `sslmode=require`, set `target_metadata = Base.metadata`.
- **First migration** — run `alembic revision --autogenerate -m "init schema"`, then **manually add** what autogenerate misses: `CREATE EXTENSION vector` (or enable pgvector in the dashboard if the pooler blocks it), `CREATE EXTENSION pgcrypto`, the `tsv` generated column on `chunks` (`to_tsvector('english', text)`) with a GIN index, and verify the HNSW index ops are correct.

## How to test

- `uv run alembic upgrade head` completes without error.
- From psql or the provider's SQL editor: `select tablename from pg_tables where schemaname='public';` shows all seven tables; `select extname from pg_extension where extname='vector';` returns `vector`.
- `\d+ chunks` shows `embedding vector(1536)` and `chunks_embedding_idx` as `hnsw`; the `tsv` column and its GIN index exist.
- Backend connects: `tests/test_schema.py` executes `select 1` through `app.db.engine`.
- `tests/test_schema.py` also asserts the seven tables exist, `chunks.embedding` is `vector(1536)`, `chunks_embedding_idx` uses `hnsw` with `vector_cosine_ops`, `chunks_tsv_idx` uses `gin`, and `tsv` is a generated column — read from `pg_tables`, `pg_indexes`, and `information_schema`.
- Run the suite from the project: `uv run pytest tests/test_schema.py`.
- Reproducibility: use a second schema or a throwaway project, re-run `upgrade head`, same result.
