# Step 11 — Landing Page, Persistent App Shell, Random Chat IDs

**Goal:** turn the app into a proper product shell. `localhost:3000` shows a public landing page with an **Open App** button. All app pages (`/c/new`, `/ingest`, `/c/:chatId`) share one persistent **navbar** (Home, New Chat, Ingest). `/c/new` and `/c/:chatId` additionally share one persistent **collapsible sidebar** that survives navigation between them. Chat URLs stop being sequential integers (`/c/1`, `/c/2`) and become **random long IDs** that cannot collide between users/sessions. The scope selector shows only human metadata (title, channel, duration, item count) — never internal video/playlist IDs. Positioning (not colors) is modeled on the perplexica app (`D:\code\perplex\perplexica`): floating rounded sidebar, floating sidebar trigger, scrollable message column and bottom-docked input that share the same centerline. Colors/visual design stay as-is (zinc dark) and get reworked later.

**Prerequisite:** Step 09 (chat UI exists), Step 08 (chat backend), Step 03 (Alembic migrations).

## What changes at a glance

| Area | Today | After this step |
|---|---|---|
| `/` | redirects to `/ingest` | public landing page with **Open App** → `/c/new` |
| Chat IDs | sequential int PK (`/c/1`) | random long string ID (`/c/8347…21-digit`) |
| Chat creation | server creates chat on first send, navigate after response | client generates ID on Enter, navigates immediately, backend adopts the ID |
| Layout | each route renders its own sidebar | parent route renders navbar + sidebar once; pages render into `<Outlet/>` |
| Scope selector | title with youtube-ID fallback | metadata rows (thumbnail, title, channel, duration, item count), no raw IDs rendered |
| Sidebar | static left column per page | perplexica-style floating panel with toggle, persists across `/c/new` ↔ `/c/:id` |

## Perplexica positioning reference (copy structure, NOT colors)

Read these files in `D:\code\perplex\perplexica\components` and mirror their layout mechanics only:

- `AppShell.tsx` — root is `flex h-screen w-full`; sidebar and main column are siblings; main column is `flex-1 flex flex-col` with `min-h-0` so the chat column can scroll independently.
- `Sidebar.tsx` — floating panel: `fixed top-3 left-3 bottom-3 w-64 rounded-2xl z-30`, animates between `w-64` and `w-0` with `transition-all`; content: logo header, New Chat button, scrollable chat list, user footer.
- `SidebarTrigger.tsx` — small icon button pinned `fixed left-3 top-4 z-50`, always floating above everything; toggles sidebar state.
- `ChatArea.tsx` — message scroll container fills the column (`absolute inset-0 overflow-y-auto`), messages centered in `mx-auto max-w-3xl` with generous vertical spacing; input docked at the bottom (`absolute bottom-0 inset-x-0 z-20`) wrapped in the **same `max-w-3xl` centerline** as the messages (this is the "input and chat section in line" requirement); scroll-to-bottom pill appears centered above the input once you scroll >300 px up.
- `ChatInput.tsx` — rounded card at the bottom, auto-growing textarea (`max-h` cap), Enter sends / Shift+Enter newline, action buttons bottom-left, circular send button bottom-right.
- `ChatMessage.tsx` — user message right-aligned bubble (`justify-end`, `max-w-[80%]`, `rounded-2xl`); assistant message left-aligned full-width markdown; hover-revealed copy/retry actions under the bubble.

Take: dimensions (`w-64`, insets, `max-w-3xl`), fixed/floating behavior, toggle mechanics, scroll/pin structure, alignment. Do **not** take: any hex colors, gradients, pink/fuchsia tokens, noise textures, framer-motion extras.

## Part A — Backend: random chat IDs (slugs)

Keep the integer PK for FKs (`messages.chat_id`, langgraph `thread_id`), add a public random ID used everywhere a chat is exposed.

1. **Migration (alembic):** add `slug VARCHAR(32) NOT NULL UNIQUE` to `chats`. Backfill existing rows with generated random IDs (18+ digit random number or 21-char nanoid). Index: unique constraint only.
2. **`app/models.py`:** add `slug` column to `Chat`.
3. **ID format:** a random long number string — 18–24 digits, generated client-side via `crypto.getRandomValues` (no sequential component). At ~10^18 keyspace, collisions are practically impossible; the unique constraint is the final guard.
4. **`app/schemas/chat_request.py`:** `chat_id` becomes `str | None` (the slug). Validate with a strict regex (`^\d{18,24}$`); reject anything else with 422 so IDs can't be spoofed into odd shapes.
5. **`POST /chat` semantics:** if `chat_id` is provided → look up by `slug` **scoped to the user**. Found → continue the chat. Not found → create the chat **with that slug** (adopt the client's ID) instead of auto-incrementing only. If `chat_id` is absent → server generates a slug itself (fallback path). On a unique-constraint collision (two tabs generated the same number), return 409; the client regenerates and retries once.
6. **Lookup endpoints:** `GET /chats/{chat_id}` and every internal reference switch from int PK to slug (path param becomes a string). `GET /chats` and `ChatDetail` return the slug as the chat's `id`/`chat_id` field. The int PK never leaves the API.
7. **LangGraph checkpointer:** `thread_id` stays `str(<int PK>)` — unchanged, so existing checkpoints keep working. Slugs are a routing layer only.
8. **Old URLs:** no compatibility mapping — this is dev-stage, breaking `/c/1` links is fine.

## Part B — Backend: library metadata for the selector

9. **`VideoOut`** gains `channel`, `duration_s`, `thumbnail_url` (fields already exist on the `Video` model). `PlaylistOut` already has `title` + `item_count`. Keep internal IDs in the payloads (the scope API needs them) — the rule is the **UI never renders** `id`, `youtube_video_id`, `youtube_playlist_id`, or `playlist_id` as text.

## Part C — Frontend: routing, navbar, landing

10. **Port:** Vite dev server runs on port **3000** (`server.port` in `vite.config.ts`) so `localhost:3000` is the app.
11. **`src/lib/ids.ts`:** `newChatId()` → 18–24 digit random numeric string via `crypto.getRandomValues` (reject/redo on leading-zero-only results).
12. **Route tree (`src/App.tsx`)** — restructure to nested persistent layouts:

    - `/` → `Landing` (public, no auth wrapper)
    - `/signin`, `/auth/callback` → unchanged
    - `AppLayout` (protected; renders **Navbar** + `<Outlet/>`)
      - `/ingest` → existing `Ingest`
      - `ChatLayout` (renders **Sidebar** + floating trigger + `<Outlet/>`; holds sidebar state)
        - `/c/new` → `ChatPage` in "new" mode (static segment — React Router ranks it above the dynamic one)
        - `/c/:chatId` → same `ChatPage` component, hydrated mode (`chatId` is now a string slug; drop every `Number(chatId)`)

    Because `AppLayout` and `ChatLayout` are parent route elements, navigating `/c/new → /c/xyz` swaps only the outlet content — navbar and sidebar never remount, and sidebar collapse state survives.
13. **`src/components/layout/Navbar.tsx`:** slim top bar on every app page. Left: brand. Center/left: three links — **Home** (`/`), **New Chat** (`/c/new`), **Ingest** (`/ingest`) — with an active-route indicator ( NavLink's active state). Right: keep it minimal (user chip can stay in the sidebar footer).
14. **`src/routes/Landing.tsx`:** standalone public page (its own full-screen layout, not inside AppLayout). Hero: product name, one-line pitch ("Chat with your YouTube library"), primary **Open App** button → `navigate('/c/new')`. Signed-out users who click it land on `/signin` via the existing Protected wrapper on `/c/new` — that flow is intentional and stays.

## Part D — Frontend: the chat shell (perplexica positioning)

15. **`src/components/layout/ChatLayout.tsx`:**
    - Owns `sidebarState: 'expanded' | 'collapsed'`. Default: expanded on desktop, collapsed under `md`. Persists across route changes (state lives here, not in the pages).
    - Sidebar panel: floating — `fixed top-3 left-3 bottom-3 w-64 rounded-2xl z-30`, animated width (`w-64 ↔ w-0`, `transition-all duration-300`), contents fade with the width. Not a `border-r` column like today.
    - Sidebar contents: brand, **New Chat** button (full-width, navigates `/c/new`), scrollable chat list from `api.listChats()`, user chip + sign-out footer (reuse existing logic).
    - Chat list rows: one row per chat, left icon + **the first user message as the row label**. Backend stores the title as the first message capped at ~60 chars (`title = first message[:60]` when the chat row is created). The row renders it **explicitly truncated**: a tiny `truncateLabel(text, 28)` helper (in `src/lib/`) returns `text.length > 28 ? text.slice(0, 28).trimEnd() + '…' : text` — first few characters, then an ellipsis, deterministic at any panel width. Keep `truncate` on the span as a safety net and put the full stored title in a `title` tooltip on hover. Falling back to "Untitled chat" if empty. Clicking a row navigates to `/c/{slug}`; the current chat's row is highlighted (match `:chatId`). Keep the list ordered newest-first — `Chat.id` (int PK) ordering still works since the slug is only a routing layer.
    - Trigger: `fixed left-3 top-4 z-50` panel-left icon button, visible on every chat page, toggles the state. When expanded it floats over the sidebar's top edge; when collapsed it floats over the chat content.
    - Main column: `flex-1 flex flex-col min-w-0`; when expanded add a left margin matching the panel (`md:ml-64`, same `transition-all` so content slides with the sidebar).
    - Mobile (`< md`): sidebar overlays content with a dark scrim; tapping the scrim or the trigger closes it.
16. **Chat column (shared by `/c/new` and `/c/:chatId`):** relative full-height flex column:
    - **Scroll region:** fills remaining height, `overflow-y-auto` with a stable scrollbar gutter; inner content `mx-auto max-w-3xl`, roomy vertical rhythm (`space-y-10`+), bottom padding tall enough to clear the input dock.
    - **Empty state (`/c/new`):** centered welcome block above the input dock — headline + hint to pick a scope ("Ask anything about an ingested video or playlist").
    - **Input dock:** pinned to the bottom of the column, `z-20`, inner wrapper `mx-auto max-w-3xl` — the exact same centerline as the messages. Contains, stacked: ScopeSelector, then the input card. Reuse the existing auto-grow textarea + Enter-to-send + disabled-while-thinking behavior; keep the existing `Messages.tsx`/`CitationChip.tsx` rendering inside the new scroll region.
    - **Scroll-to-bottom pill:** centered above the input dock; appears only when the scroll region is >300 px from the bottom; click smooth-scrolls down. Auto-scroll to the latest message on send/response (keep current behavior).
    - User bubble right-aligned (`max-w-[80%]`, rounded), assistant left with markdown — same as today, just re-homed in the new scroll region.

## Part E — First-message flow (the "hit Enter goes to /c/:id" behavior)

17. On `/c/new`, Enter triggers all of this:
    1. `const id = newChatId()`
    2. `navigate('/c/' + id)` immediately (with the pending message + chosen scope passed via router state so the chat page picks it up without re-typing)
    3. `ChatPage` (now on `/c/:id`) fires `api.sendChat({ message, chat_id: id, scope })` — the backend adopts the slug and creates the chat (Part A #5)
    4. Optimistic user bubble stays, "thinking" indicator shows, answer appends — exactly the current send path, minus the post-response redirect.
18. In-flight refresh on a brand-new `/c/:id`: `getChat` 404s (chat not yet committed) → redirect to `/c/new` with a "Chat wasn't created — try again" message rather than a dead error screen.
19. Changing scope on an existing chat still starts a fresh chat at `/c/new?scope=…` (current behavior) — scope is fixed per chat.
20. The scope selector is **single-select** — one video, one playlist, or the entire library; never multiple.

## Part F — Scope selector metadata rework

21. Dropdown rows show metadata only:
    - Video: thumbnail (small rounded `img`, fallback icon), title (fallback "Untitled video" — never the youtube ID), channel, duration via `formatTime`.
    - Playlist: title, item count ("N videos").
    - "Entire library" option stays.
    - Selected-value button shows the same metadata summary. Group headers "Videos" / "Playlists" stay. Backend Part B supplies the fields.

## States

- Loading: chat history skeleton while `getChat` hydrates; spinner in the input's send button while thinking.
- Empty: no chats → "No chats yet — start one from a video." No ready media → "Ingest a video to scope your chat."
- Errors: 404 chat → redirect `/c/new` with notice; 409 slug collision → client regenerates the ID and retries once; send failure → keep the user bubble, show retryable error (current behavior).
- 401: existing Protected redirect to `/signin` unchanged, including from the landing page's Open App.

## How to test

- Open `localhost:3000` signed out → landing page renders; **Open App** → lands on `/signin` (protected) → sign in → `/c/new`.
- Navbar shows on `/c/new`, `/ingest`, and a chat page; Home/New Chat/Ingest navigate correctly; active link is indicated.
- On `/c/new`: sidebar visible, toggle collapses it to nothing (content slides over), toggle again restores — **navigate between two chats and /c/new: sidebar state, scroll position of the chat list, and collapse state persist** (no remount flash).
- Pick a video in the scope selector: rows show thumbnail/title/channel/duration; no raw IDs anywhere in the DOM text of the selector.
- Type a message, hit Enter → URL becomes `/c/<18–24-digit-random>` **immediately**, message sends, answer + citations render.
- Reload that URL → history hydrates by slug; two different chats show different unrelated random IDs; sequential `/c/1`-style URLs are gone (404 → `/c/new`).
- Send again in the same chat → multi-turn memory intact (thread_id unchanged).
- Scroll up mid-chat → scroll-to-bottom pill appears; click it → smooth scroll down.
- Mobile width: sidebar overlays with scrim, closes on scrim tap; input remains fully usable.
- Ingest a new video → it appears in the scope selector with metadata after it turns `ready`.
