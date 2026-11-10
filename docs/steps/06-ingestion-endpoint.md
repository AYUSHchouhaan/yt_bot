# Step 06 — Ingestion Endpoint

**Goal:** `POST /ingest/video` creates a video row, runs the full pipeline in the background (fetch → chunk → embed → store), and `GET /jobs/{id}` reports progress.

**Prerequisite:** Step 05.

## What to implement

### `app/services/embeddings.py`
- **`embed_texts(texts)`** — call OpenAI `embeddings.create` with `text-embedding-3-small`, in batches of 64. Return a list of vectors.
- **`embed_query(text)`** — single embedding for the question (used in step 07).
- **`content_hash(text)`** — SHA-256 short hash for dedup tracking.

### `app/services/ingest.py`
- **`ingest_video(video_id, user_id, session)`** — the orchestrator. Steps:
  1. Load the video row, verify ownership.
  2. Set `status='fetching'`, commit. Call `fetch_metadata` + `fetch_transcript` + `clean_cues`. Store `full_text` and `segments` JSONB on the video row.
  3. Set `status='embedding'`, commit. Run `cues_to_sentences` → `build_chunks`. Delete any existing chunks for this video (re-ingest safety). Embed all chunk texts. Bulk-insert chunk rows with `video_id`, `user_id`, `playlist_id`, `chunk_index`, `text`, `start_s`, `end_s`, `content_hash`, `embedding_model`, `embedding`.
  4. Set `status='ready'`, commit.
  5. On any exception: set `status='failed'`, store truncated error, re-raise.

### `app/routers/ingest.py`
- **`POST /ingest/video`** — body `{url}`. Parse the YouTube ID. Check if a `(user_id, youtube_video_id)` row already exists and is `ready` — if so, return immediately (idempotent). Otherwise create a `Video` row (`status='queued'`) and an `IngestJob` row. Schedule `ingest_video` via `BackgroundTasks`. Return `{video_id, job_id}`.
- **`_run_ingest`** helper — opens its own session (background tasks need a fresh session), calls `ingest_video`, updates the job's `done`/`status` on success or failure.

### `app/routers/jobs.py`
- **`GET /jobs/{job_id}`** — protected, ownership-checked. Returns `{status, total, done, error}`.

Wire both routers into `main.py`.

## How to test

- In Swagger: authenticate, `POST /ingest/video` with a real YouTube URL, note the `job_id`.
- Poll `GET /jobs/{job_id}` every few seconds until `status` is `ready` or `failed`.
- In psql: `select status from videos` → `ready`. `select count(*) from chunks` → ~100 for a 1-hour video (target 45 s, constant 10 s overlap). `select vector_dims(embedding) from chunks limit 1` → 1536. `select min(length(text)) from chunks` → ≥40.
- Re-post the same URL → returns `already_ready`, no new rows created.
- Post a URL for a video with captions disabled → `status='failed'` with a sensible error message.
- `tests/test_ingest.py` — monkeypatch `fetch_metadata`, `fetch_transcript`, and `embed_texts` so the test runs offline; assert the `queued → fetching → embedding → ready` transitions, the chunk count, 1536-d embeddings, and that re-posting the same URL is a no-op.
