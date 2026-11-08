# Step 08 — Basic Frontend (Working Chat UI)

**Goal:** minimal but functional UI — add a URL, see ingest status, ask a question, see the streamed answer. No styling polish (that's step 09).

**Prerequisite:** Step 07.

## What to implement

### `src/lib/api.ts`
- An `api` object wrapping `authFetch` calls: `me()`, `ingestVideo(url)`, `getJob(id)`, `getLibrary()`, `getTranscript(videoId)`.

### `src/components/library/AddUrl.tsx`
- Input + button. On submit, call `api.ingestVideo` via `useMutation`. On success, `invalidateQueries(['library'])` so the list refreshes.

### `src/components/library/VideoList.tsx`
- `useQuery(['library'])` → render a flat list of videos with their status. Each item links to `/videos/:videoId`.

### `src/components/chat/ChatPanel.tsx`
- The core component. Holds `messages` state and `citations` state.
- On send: append the user message, append an empty assistant message, call `fetch('/api/chat', ...)` with the bearer token from `supabase.auth.getSession()`.
- Parse the SSE stream from `response.body.getReader()` + `TextDecoder`: split on `\n\n`, parse `event:` and `data:` lines.
  - `citations` event → store in state (render as links to `youtu.be/{id}?t={start_s}`).
  - `delta` event → append `text` to the last assistant message.
  - `done` event → set streaming=false.
- Enter key sends. Input disabled while streaming.

### `src/routes/Library.tsx`
- `AddUrl` + `VideoList` in a centered column.

### `src/routes/VideoPage.tsx`
- Renders `ChatPanel` with the `videoId` from params.

### `src/App.tsx`
- Routes: `/signin`, `/auth/callback`, `/` (protected Library), `/videos/:videoId` (protected VideoPage).

### Backend gap
- You need `GET /library` (list videos for the current user) and `GET /videos/:id/transcript` (return `full_text` + `segments`). Add a `library.py` router with simple `SELECT ... WHERE user_id = :me` queries, ownership-checked.

## How to test

- Sign in → paste a YouTube URL → it appears in the list with `status: queued`.
- Refresh or wait → status changes to `fetching` → `embedding` → `ready`.
- Click the video → chat page loads.
- Ask "What is this video about?" → answer streams in token by token. Citation chips appear before the first token.
- Click a citation → YouTube opens at the correct timestamp.
- No console errors. 401 redirects to `/signin`.
