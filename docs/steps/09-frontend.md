# Step 09 — Frontend

**Goal:** the full product UI — sign-in, ingestion, and a ChatGPT-style multi-turn chat over an ingested video or playlist. One frontend step (the old "basic" + "advanced" split is gone). Non-streaming: each send awaits a JSON `{answer, citations}` and renders it.

**Prerequisite:** Step 08.

## Routes

- `/signin` — Supabase Google sign-in (wired in step 04). Redirects to `/ingest` on success.
- `/auth/callback` — Supabase OAuth callback.
- `/ingest` — paste a video or playlist URL, ingest, watch status, browse library.
- `/c/:chatId` — the chat page. "New chat" creates a row and navigates here.
- `/` — redirects to `/ingest` (or the most recent chat).

## What to implement

### `src/lib/api.ts`
- `api` wrapping `authFetch` (bearer from `supabase.auth.getSession()`): `me()`, `ingestVideo(url)`, `getJob(id)`, `getLibrary()`, `listChats()`, `getChat(id)`, `sendChat({message, chat_id, scope})`.

### Signin (`src/routes/Signin.tsx`)
- Google sign-in button via Supabase. On success → `/ingest`. 401 anywhere redirects here.

### Ingest (`src/routes/Ingest.tsx`)
- Form: URL input + type toggle (video / playlist). Submit → `api.ingestVideo` (or playlist variant), then poll `api.getJob` until `ready` / `failed`.
- Library list below: videos + playlists with status badges (`queued` / `fetching` / `embedding` / `ready` / `failed`). `ready` items become selectable as a chat scope.
- Backend gap: `POST /ingest/video` and `GET /jobs/:id` come from step 06; `GET /library` from step 08.

### Chat (`src/routes/Chat.tsx` at `/c/:chatId`)
Layout: persistent **sidebar** on the left, **chat main** on the right.

- **Sidebar** (`src/components/chat/Sidebar.tsx`):
  - "New chat" button → creates a chat (optionally with a preselected scope) → navigates to `/c/:id`.
  - List of chats from `api.listChats()` (title + scoped video/playlist). Each links to `/c/:id`.
  - User avatar + sign-out at the bottom.
- **Scope selector** (`src/components/chat/ScopeSelector.tsx`) — sits **above the input box**. Dropdown of `ready` videos / playlists from `api.getLibrary()`. Sets the `scope` sent with every message (`{kind, id}`). Changing scope can start a fresh chat.
- **Message list** (`src/components/chat/Messages.tsx`):
  - User and assistant bubbles. On send: append the user message, show a "Thinking…" spinner, `POST /chat`, then append the returned `{answer, citations}`.
  - **Citation chips** (`src/components/chat/CitationChip.tsx`) — pills linking to `youtu.be/{youtube_id}?t={start_s}`. On hover: tooltip with the excerpt text. Numbered `[1]`, `[2]` to match the answer.
- **Input** (`src/components/chat/ChatInput.tsx`) — auto-growing textarea, Enter to send, disabled while a request is in flight. Scope must be set (or "library") before sending.

### `src/App.tsx`
- Routes wired with a protected wrapper: unauthenticated → `/signin`. `/c/:chatId` loads `getChat` on mount to hydrate history.

## States

- Loading: spinner / skeleton for every async action; "Thinking…" between send and response.
- Empty: "No chats yet — start one from a video."
- Error: ingest-failed badge with the message; network-error retry on chat send.
- 401: redirect to `/signin`.

## How to test

- Sign in → land on `/ingest`.
- Paste a YouTube URL → status flows `queued → fetching → embedding → ready`.
- Pick the `ready` video in the scope selector → send "What is this video about?" → answer + citation chip appear; chip opens YouTube at the right second.
- Send a follow-up referencing the previous answer → the agent answers using prior context (no re-ingest, no page reload).
- "New chat" → sidebar gains an entry → URL becomes `/c/:newId`.
- Refresh `/c/:chatId` → history hydrates from `getChat`.
- Unauthenticated access to `/c/:id` → redirects to `/signin`.
- Resize to mobile → sidebar collapses (hamburger), panes stack.
