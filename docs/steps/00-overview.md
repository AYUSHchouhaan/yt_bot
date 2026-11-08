# yt_bot — Build Steps Overview

Build in this order. Each file describes **what to implement** and **how to test** — no source code, so you write the code yourself and modify the plan as you go. Tests live inside each step, not in a separate file.

| # | File | What you build | Test focus |
|---|---|---|---|
| 01 | `01-frontend-setup.md` | Empty Vite + React + Tailwind shell | dev server + proxy |
| 02 | `02-backend-setup.md` | Empty FastAPI app with uv | `/health` endpoint |
| 03 | `03-database-setup.md` | Postgres + pgvector, all models, Alembic | migration applies, tables + indexes exist |
| 04 | `04-authentication.md` | Supabase Google login + local JWT verify | 401 cases, token validity, user upsert |
| 05 | `05-youtube-transcript-setup.md` | Transcript fetch + sentence-aware chunker | chunk bounds, overlap, no mid-sentence cuts |
| 06 | `06-ingestion-endpoint.md` | `POST /ingest/video`, embeddings, background job | ingest → ready, chunk count, idempotency |
| 07 | `07-rag-retrieval.md` | Hybrid retrieval + streaming `/chat` SSE | retrieval scope, SSE frame order, messages saved |
| 08 | `08-basic-frontend.md` | Working chat UI with SSE parsing | add URL → ask → streamed answer |
| 09 | `09-advanced-frontend.md` | Polished design, transcript pane, citations | visual + interaction checklist |
| 10 | `10-env-and-config.md` | Env templates, docker-compose, gitignore | config loads, git clean |

## v1 scope (locked)

- Flat chunking: playlist → video → chunks (no chapter hierarchy).
- Hybrid retrieval: pgvector cosine + Postgres full-text, fused with RRF.
- 45 s target chunks (35–55 s bounds, 10 s overlap, sentence-aligned).
- Seven tables: `app_users`, `playlists`, `videos`, `chunks`, `ingest_jobs`, `chats`, `messages`.

## Reference docs

- `docs/ARCHITECTURE.md` — full system architecture
- `docs/INGESTION_AND_RETRIEVAL.md` — chunking spec, retrieval strategy, assignment mapping
