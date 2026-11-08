# yt_bot — Architecture

YouTube video/playlist transcript assistant: ingest a URL → store transcript → chunk + embed → ask questions answered only from that content, with clickable timestamp citations.

```
React (Vite) ── Supabase Auth (Google) ──► JWT
    │
    │ Authorization: Bearer <jwt>
    ▼
FastAPI ──► yt-dlp / youtube-transcript-api ──► chunker ──► OpenAI embeddings
    │                                                            │
    ▼                                                            ▼
Postgres + pgvector  (users, playlists, videos, chunks, chats, messages, jobs)
    │
    └──► retrieval (cosine top-k, user-scoped) ──► LLM ──SSE──► React
```

---

## 1. Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React 19 + Vite + TypeScript + Tailwind 4 | `frontend/` |
| Routing | react-router-dom | |
| Server state | TanStack Query | caching, polling, invalidation |
| Auth (client) | `@supabase/supabase-js` | Google OAuth |
| Backend | FastAPI + SQLAlchemy 2.0 async + asyncpg | `backend/` |
| Package manager | uv | `uv run uvicorn ...` |
| Migrations | Alembic | schema is code |
| Database | Postgres 16 + pgvector | local: `pgvector/pgvector:pg16`; prod: Supabase |
| Auth (server) | PyJWT — verify locally (JWKS, HS256 fallback) | no per-request call to Supabase |
| Transcripts | `youtube-transcript-api` → `yt-dlp` VTT fallback | no video/audio download |
| Embeddings | OpenAI `text-embedding-3-small` (1536d) | batched |
| LLM | OpenAI chat completions, streamed | |
| Background work | FastAPI `BackgroundTasks` + `ingest_jobs` table | upgrade to Celery later |

---

## 2. Repo layout

```
yt_bot/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, CORS, routers
│   │   ├── config.py          # pydantic-settings
│   │   ├── db.py              # async engine, session, Base
│   │   ├── models.py          # all tables
│   │   ├── schemas.py         # request/response DTOs
│   │   ├── auth/              # jwt.py (verify), deps.py (current user)
│   │   ├── routers/           # me, library, ingest, chat
│   │   └── services/          # youtube, chunker, embeddings, ingest, retrieval, rag
│   ├── alembic/versions/      # 001_init.py
│   └── tests/
├── frontend/
│   └── src/
│       ├── lib/               # supabase.ts, http.ts, api.ts
│       ├── components/        # auth/, library/, chat/
│       └── routes/            # Library, VideoPage, PlaylistPage, ChatPage
└── docs/
```

---

## 3. Frontend pages & routes

| Route | Page | Purpose | Auth |
|---|---|---|---|
| `/signin` | `SignIn` | "Continue with Google" | public |
| `/auth/callback` | `AuthCallback` | exchange OAuth redirect for a session | public |
| `/` | — | redirect to `/library` | — |
| `/library` | `Library` | add-by-URL dialog, playlists + videos, ingest status | protected |
| `/videos/:videoId` | `VideoPage` | transcript pane + chat pane | protected |
| `/playlists/:playlistId` | `PlaylistPage` | video list + chat scoped to the playlist | protected |
| `/chats/:chatId` | `ChatPage` | resume an existing conversation | protected |
| `*` | — | redirect to `/library` | — |

Shared components:

- `Protected` — wraps protected routes, subscribes to `onAuthStateChange`.
- `VideoCard` — status badge; polls `/jobs/{id}` while queued/fetching/embedding.
- `ChatPanel` — message list, input, SSE stream parsing.
- `CitationChip` — links to `https://youtu.be/{id}?t={floor(start_s)}`.

---

## 4. Backend API routes

All routes except `/health` require `Authorization: Bearer <supabase-jwt>` and are scoped to the caller's user id.

| Method | Path | Body / Query | Returns |
|---|---|---|---|
| GET | `/health` | — | `{status}` |
| GET | `/me` | — | current user profile (upserts local row) |
| POST | `/ingest/video` | `{url}` | `{video_id, job_id}` |
| POST | `/ingest/playlist` | `{url}` | `{playlist_id, job_id, total}` |
| GET | `/jobs/{job_id}` | — | `{status, total, done, error}` |
| GET | `/library` | — | playlists + videos with status |
| GET | `/videos/{video_id}/transcript` | — | `{full_text, segments}` |
| DELETE | `/videos/{video_id}` | — | `204` |
| POST | `/chat` | `{message, video_id?, playlist_id?, chat_id?}` | SSE stream |
| GET | `/chats` | — | conversation list |
| GET | `/chats/{chat_id}/messages` | — | messages + citations |

Ownership rule: lookups always use `WHERE id = :id AND user_id = :me`; a mismatch returns **404**, never 403.

SSE frame shapes:

```
event: delta      data: {"text": "..."}
event: citations  data: [{"youtube_id":"...","title":"...","start_s":754,"score":0.81}]
event: done       data: {"message_id": 123}
```

---

## 5. Database tables

| Table | Key columns | Purpose |
|---|---|---|
| `app_users` | `id`, `supabase_id` (unique), `email`, `display_name`, `avatar_url` | mirror of Supabase users |
| `playlists` | `id`, `user_id`, `youtube_playlist_id`, `title`, `item_count` | one row per ingested playlist |
| `videos` | `id`, `user_id`, `playlist_id`, `youtube_video_id`, `title`, `channel`, `duration_s`, `thumbnail_url`, `status`, `error`, `transcript_source`, `language`, `full_text`, `segments` (jsonb) | one row per video + its transcript |
| `chunks` | `id`, `video_id`, `user_id`, `playlist_id`, `chunk_index`, `text`, `start_s`, `end_s`, `embedding vector(1536)` | searchable pieces |
| `ingest_jobs` | `id`, `user_id`, `kind`, `target`, `total`, `done`, `status`, `error` | progress tracking |
| `chats` | `id`, `user_id`, `video_id`, `playlist_id`, `title` | conversation scope |
| `messages` | `id`, `chat_id`, `role`, `content`, `citations` (jsonb) | turns + sources |

```sql
create extension if not exists vector;
create extension if not exists pgcrypto;

-- chunks
embedding vector(1536) not null
create index chunks_embedding_idx on chunks using hnsw (embedding vector_cosine_ops);
create index chunks_user_idx on chunks (user_id);
create index chunks_video_idx on chunks (video_id);
create unique index chunks_video_chunk_idx on chunks (video_id, chunk_index);

-- videos
create index videos_user_status_idx on videos (user_id, status);
alter table videos add constraint videos_user_video_key unique (user_id, youtube_video_id);
```

Relations: `app_users 1─N playlists`, `app_users 1─N videos`, `playlists 1─N videos`, `videos 1─N chunks`, `app_users 1─N chats`, `chats 1─N messages`. All `ON DELETE CASCADE` down the chain.

Video status lifecycle: `queued → fetching → embedding → ready` (or `failed`).

---

## 6. Ingestion flow

1. `POST /ingest/video` parses the URL (`watch?v=`, `youtu.be/`, `shorts/`), upserts the `videos` row (`status='queued'`), creates an `ingest_jobs` row, returns immediately.
2. Background task sets `status='fetching'`.
3. Metadata via `yt_dlp.extract_info(download=False)`.
4. Transcript via `YouTubeTranscriptApi().fetch(video_id, languages=['en','en-US'])`.
   - Fallback: `yt-dlp` auto-subtitles as VTT → parse cues.
   - Normalize: dedupe rolling auto-caption lines, drop `[Music]`.
5. Save `full_text` and `segments` (`[{start, end, text}]`).
6. `status='embedding'` → `chunk_segments()`: accumulate cues to ~900 chars, carry one cue as overlap, keep `start_s`/`end_s`.
7. Embed in batches of 64 (`text-embedding-3-small`), bulk insert into `chunks`.
8. `status='ready'`; `ingest_jobs.done += 1`.

Playlist: enumerate with `yt_dlp` (`extract_flat`), create one `videos` row per item, process sequentially with `asyncio.Semaphore(3)`, per-item commit so a partial run is visible and resumable.

---

## 7. Retrieval + chat flow

```
question → embed → SQL top-8 (filtered by user_id + optional video/playlist)
        → prompt with [Video: title @ 12:34] blocks
        → OpenAI stream → SSE to browser
```

```sql
set local hnsw.ef_search = 100;

select c.text, c.start_s, c.end_s, v.youtube_video_id, v.title,
       1 - (c.embedding <=> :q) as score
from chunks c
join videos v on v.id = c.video_id
where c.user_id = :me
  and (:playlist_id is null or c.playlist_id = :playlist_id)
  and (:video_id    is null or c.video_id    = :video_id)
order by c.embedding <=> :q
limit 8;
```

- System prompt: answer only from the excerpts; say so when the answer is absent.
- Citations emitted before tokens so chips render immediately.
- User message saved before streaming; assistant message + citations saved after the stream ends.
- If filtered HNSW under-returns, over-fetch 50 and cut to 8 in Python.

---

## 8. Auth flow

1. Frontend: `supabase.auth.signInWithOAuth({ provider: 'google' })`.
2. Supabase handles Google; redirects to `/auth/callback`; `supabase-js` (`detectSessionInUrl: true`) stores the session.
3. `authFetch` attaches `Authorization: Bearer <access_token>`.
4. Backend `get_current_user`: `PyJWKClient(SUPABASE_JWKS_URL)` (or HS256 with `SUPABASE_JWT_SECRET`), verify `exp` and `aud == "authenticated"`, return `sub`/`email`.
5. `get_db_user` lazily upserts `app_users` from claims.
6. `onAuthStateChange` in the frontend handles sign-out and expiry.

---

## 9. Environment variables

```
# backend/.env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/ytbot
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_JWKS_URL=
SUPABASE_JWT_SECRET=
OPENAI_API_KEY=
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
CORS_ORIGINS=http://localhost:5173
YT_PROXY_URL=

# frontend/.env.local
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## 10. Deliberately out of scope (v1)

Whisper for uncaptioned videos · reranking · cross-video synthesis · semantic search across the whole library · shareable chats · Celery/Redis queue · streaming ingestion progress beyond a polled counter.
