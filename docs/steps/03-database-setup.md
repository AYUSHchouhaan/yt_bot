# Step 03 — Database Setup

**Goal:** Postgres + pgvector in Docker, all seven v1 models defined, first Alembic migration created and applied.

**Prerequisite:** Step 02.

## Commands

```powershell
docker run -d --name ytbot-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ytbot -p 5432:5432 -v ytbot_pgdata:/var/lib/postgresql/data pgvector/pgvector:pg16
docker exec ytbot-pg psql -U postgres -d ytbot -c "create extension if not exists vector;"
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
- **Alembic `env.py`** — import `Base.metadata` and all models, set the URL to a sync variant (`+psycopg` instead of `+asyncpg`), set `target_metadata = Base.metadata`.
- **First migration** — run `alembic revision --autogenerate -m "init schema"`, then **manually add** what autogenerate misses: `CREATE EXTENSION vector`, `CREATE EXTENSION pgcrypto`, the `tsv` generated column on `chunks` (`to_tsvector('english', text)`) with a GIN index, and verify the HNSW index ops are correct.

## How to test

- `uv run alembic upgrade head` completes without error.
- `\dt` in psql shows all seven tables.
- `\d+ chunks` shows `embedding vector(1536)` and `chunks_embedding_idx` as `hnsw`.
- The `tsv` column exists and the GIN index is present.
- Drop the database, re-run `upgrade head`, same result (reproducible).
