# Step 07 — RAG Retrieval & Streaming Chat

**Goal:** hybrid retrieval (pgvector cosine + Postgres full-text, fused with RRF), grounded prompt, streamed answer via SSE, citations with timestamps.

**Prerequisite:** Step 06 (at least one video ingested and `ready`).

## What to implement

### `app/services/retrieval.py`
- **`hybrid_search(session, query, user_id, video_id, playlist_id, limit=12)`** — one SQL query with two CTEs:
  - `sem`: top 40 chunks by cosine distance (`embedding <=> :qvec`), filtered by `user_id` + optional `video_id`/`playlist_id`.
  - `lex`: top 40 chunks by `ts_rank_cd(tsv, websearch_to_tsquery('english', :q))`, same filters, only rows where `tsv @@` matches.
  - `fused`: `UNION ALL` both, group by id, sum `1/(60 + rnk)` (Reciprocal Rank Fusion). Join back to `chunks` + `videos` for text, timestamps, title, youtube_id. Order by fused score, limit 12.
  - Set `hnsw.ef_search = 100` at the top of the query.

### `app/services/rag.py`
- **`build_context(hits)`** — numbered blocks formatted as `[1] <title> @ <mm:ss>\n<text>`.
- **`build_citations(hits)`** — list of `{youtube_id, title, start_s, score}`.
- **`stream_answer(question, context)`** — a generator that calls OpenAI `chat.completions.create` with `stream=True`, `temperature=0.2`. System prompt: "Answer only from the provided transcript excerpts. If absent, say you couldn't find it. Cite sources as [1], [2]." Yields SSE-formatted `event: delta` frames with `{"text": token}`.

### `app/routers/chat.py`
- **`POST /chat`** — body `{message, video_id?, playlist_id?, chat_id?}`. Protected.
  - Validate scope ownership (video/playlist belongs to caller → else 404).
  - Call `hybrid_search` for the top 12 hits.
  - Create a `Chat` row if no `chat_id` given. Insert the user `Message`.
  - Return a `StreamingResponse` (media type `text/event-stream`) whose generator:
    1. Emits `event: citations` with the citation list first (so chips render before text).
    2. Streams `event: delta` frames from `stream_answer`.
    3. After the stream ends, saves the assistant `Message` (with citations) in a background task.
    4. Emits `event: done` with `{chat_id}`.

Wire the router into `main.py`.

## How to test

- `curl -N -X POST http://localhost:8000/chat` with a valid bearer token and a question about an ingested video.
- Confirm the SSE stream sends: `citations` event **before** any `delta` events, then `delta` frames with text fragments, then `done`.
- Confirm both a user and an assistant `Message` row exist in the database after the stream closes.
- Ask a question whose answer exists at a known timestamp → citation `start_s` is within ±30 s.
- Ask something absent from the transcript → the model refuses rather than hallucinating.
- `tests/test_retrieval.py` — seed chunks for users A and B through the rollback fixture in `tests/conftest.py`, then assert `hybrid_search` as B returns none of A's chunks, that RRF ordering is stable, and that `hnsw.ef_search` is applied.
- `tests/test_chat.py` — monkeypatch `stream_answer` to yield fixed frames and assert SSE order: `citations` before any `delta`, then `done`.
