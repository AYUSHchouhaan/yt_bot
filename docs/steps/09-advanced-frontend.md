# Step 09 — Advanced Frontend (Polished Design)

**Goal:** turn the working-but-plain UI from step 08 into a polished product. Design decisions and component upgrades, not new features.

**Prerequisite:** Step 08.

## Design direction

- Dark-first: `zinc-950` background, `zinc-900` surfaces, `zinc-800` borders. One accent color (indigo or emerald) used consistently for buttons, links, focused inputs.
- Bento/masonry library grid — varied card sizes based on video duration, not a uniform list.
- Two-pane video page: transcript on the left, chat on the right. Collapsible on mobile.
- Rich micro-interactions: cards lift and reveal a description on hover, smooth transitions, animated status badges.
- Citation chips expand on hover to show the exact transcript excerpt.

## What to implement

### Layout
- **`Sidebar`** — persistent left nav: app logo, library link, user avatar + sign-out. Collapses to a hamburger on mobile.
- **`VideoPage`** — two-pane: `TranscriptPane` (left, 40%) + `ChatPanel` (right, 60%). Stacks vertically on mobile.

### Library
- **`VideoCard`** — thumbnail, title, channel, duration, status badge with color + pulse animation for in-progress states. On hover: card lifts (`-translate-y-1`), ring brightens, overlay reveals "Click to chat →". Size variant (`sm`/`md`/`lg`) drives `col-span` for the bento grid.
- **`Library`** — CSS grid (3 columns), assign sizes in a varied pattern so cards aren't uniform.

### Chat
- **`ChatPanel` upgrades** — dark message bubbles, auto-scroll to bottom during streaming, "Thinking…" indicator before first token, input disabled until video is `ready`.
- **`CitationChip`** — pill link to `youtu.be/{id}?t={start_s}`. On hover: absolute-positioned tooltip showing the excerpt text from that chunk. Indigo ring that brightens on hover.
- **`TranscriptPane`** — scrollable list of segments with timestamps. Clicking a line seeks (emits timestamp or opens YouTube). Highlight the line whose timestamp matches the most recent citation.

### States
- Loading: skeleton or spinner for every async action.
- Empty: "No videos yet — paste a URL to get started."
- Error: ingest failed badge with the error message, network error retry button.
- 401: redirect to `/signin`.

## How to test (visual + interaction checklist)

- Hover a video card → it lifts and reveals text.
- Status badges animate (`fetching`/`embedding` pulse, `ready` is solid green).
- Video page: transcript and chat side by side. Transcript scrolls independently.
- Ask a question → answer streams with styled bubbles, auto-scrolls.
- Hover a citation chip → tooltip shows the excerpt.
- Click a citation → YouTube opens at the right second.
- Resize to mobile → sidebar collapses, panes stack, grid becomes single column.
- Empty library shows the prompt. Failed ingest shows the error.
