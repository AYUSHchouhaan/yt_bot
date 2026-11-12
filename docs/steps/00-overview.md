# yt_bot — Build Steps Overview

Build in this order. Each file describes **what to implement** and **how to test** — no source code, so you write the code yourself and modify the plan as you go. Tests live inside each step, not in a separate file.

| # | File | What you build | Test focus |
|---|---|---|---|
| 01 | `01-frontend-setup.md` | Empty Vite + React + Tailwind shell | dev server + proxy |
| 02 | `02-backend-setup.md` | Empty FastAPI app with uv | `/health` endpoint |
| 03 | `03-database-setup.md` | Postgres + pgvector on an external provider, models, Alembic | migration applies, tables + indexes exist |
| 04 | `04-authentication.md` | Supabase Google login + local JWT verify | 401 cases, token validity, user upsert |
| 05 | `05-youtube-transcript-setup.md` | Transcript fetch + fixed-window chunker | 45 s windows, 35 s stride, 10 s overlap |
| 06 | `06-ingestion-endpoint.md` | `POST /ingest/video`, embeddings, background job | ingest → ready, chunk count, idempotency |
| 07 | `07-rag-retrieval.md` | Hybrid retrieval (pgvector + FTS, RRF) + context builder | retrieval scope, RRF stability, ef_search |
| 08 | `08-langgraph-chatbot.md` | LangGraph agent with RAG tool, multi-turn, PostgresSaver | tool called when needed, multi-turn memory, citations |
| 09 | `09-frontend.md` | Sign-in, ingestion, ChatGPT-style chat UI, sidebar, `/c/[id]` | ingest → chat → follow-up → citation |
| 10 | `10-env-and-config.md` | Env templates, gitignore | config loads, git clean |

## v1 scope (locked)

- Flat chunking: playlist → video → chunks (no chapter hierarchy).
- Retrieval: hybrid — pgvector cosine + Postgres full-text, fused with RRF.
- Chat: LangGraph agent with a RAG tool — multi-turn, PostgresSaver checkpointer, non-streaming JSON.
- 45 s fixed windows with a 35 s stride: **constant 10 s overlap**, cut on time not sentences.
- Seven tables: `app_users`, `playlists`, `videos`, `chunks`, `ingest_jobs`, `chats`, `messages`.
- External Postgres (Supabase recommended) — no local Docker.

## Reference docs

- `docs/ARCHITECTURE.md` — full system architecture
- `docs/INGESTION_AND_RETRIEVAL.md` — chunking spec, retrieval strategy, assignment mapping
