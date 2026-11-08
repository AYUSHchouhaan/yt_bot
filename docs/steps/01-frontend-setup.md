# Step 01 — Frontend Setup

**Goal:** empty React + Vite + TypeScript + Tailwind shell with API proxy and routing skeleton.

**Prerequisite:** none.

## Commands

```powershell
cd D:\code\yt_bot\frontend
npm create vite@latest . -- --template react-ts
npm install
npm install react-router-dom @supabase/supabase-js @tanstack/react-query lucide-react
npm install -D tailwindcss @tailwindcss/vite
```

## What to implement

- **`vite.config.ts`** — add the Tailwind plugin and a dev proxy so `/api/*` forwards to `http://localhost:8000` (strips the `/api` prefix). This avoids CORS entirely in dev.
- **`src/index.css`** — replace all content with the Tailwind import (`@import "tailwindcss"`). Tailwind v4 needs no config file.
- **`src/main.tsx`** — wrap the app in `QueryClientProvider` (TanStack Query) and `BrowserRouter`. Set `staleTime: 30s` and `retry: 1` as defaults.
- **`src/App.tsx`** — a single catch-all route rendering a placeholder. Real routes come in later steps.
- **`src/lib/http.ts`** — a `apiFetch` helper that prepends `/api` and sets JSON content-type. Will gain auth token injection in step 04.
- Delete Vite's default `App.css`, `assets/`, and rename the `<title>` in `index.html`.

## How to test

- Run `npm run dev`, open `http://localhost:5173`, see the placeholder text.
- Once the backend exists (step 02), `http://localhost:5173/api/health` should return the backend's response — proving the proxy works.
- No console errors in the browser dev tools.
