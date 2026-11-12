# Step 07 — RAG Retrieval

**Goal:** hybrid retrieval (pgvector cosine + Postgres full-text, fused with RRF) and context/citation formatting, exposed as a service that the chat graph (step 08) calls. No chat endpoint, no streaming — that moves to step 08.

**Prerequisite:** Step 06 (at least one video ingested and `ready`).

## What to implement

### `app/services/retrieval.py`
- **`hybrid_search(session, query, user_id, video_id, playlist_id, limit=12)`** — one SQL query with two CTEs:
  - `sem`: top 40 chunks by cosine distance (`embedding <=> :qvec`), filtered by `user_id` + optional `video_id`/`playlist_id`.
  - `lex`: top 40 chunks by `ts_rank_cd(tsv, websearch_to_tsquery('english', :q))`, same filters, only rows where `tsv @@` matches.
  - `fused`: `UNION ALL` both, group by id, sum `1/(60 + rnk)` (Reciprocal Rank Fusion). Join back to `chunks` + `videos` for text, timestamps, title, youtube_id. Order by fused score, limit 12.
  - Set `hnsw.ef_search = 100` at the top of the query.
- Returns a list of hit dicts: `{id, text, start_s, end_s, youtube_id, title, score}`.

### `app/services/rag.py`
- **`build_context(hits)`** — numbered blocks formatted as `[1] <title> @ <mm:ss>\n<text>`. This is the string fed to the LLM.
- **`build_citations(hits)`** — list of `{youtube_id, title, start_s, score}` for the API response / UI chips.

Nothing else. The `/chat` endpoint, message history, and tool-calling live in step 08.

## How to test

- `tests/test_retrieval.py` — seed chunks for users A and B through the rollback fixture in `tests/conftest.py`, then assert:
  - `hybrid_search` as B returns none of A's chunks (scope is a `WHERE` clause, not a separate collection).
  - RRF ordering is stable across runs.
  - `hnsw.ef_search = 100` is applied (inspect the executed SQL or set a spy).
  - A BM25-only term (exact proper noun) and a dense-only paraphrase both surface in the top 12.
- Ask a question whose answer exists at a known timestamp → the top hit's `start_s` is within ±30 s.
