# Step 04 — Authentication

**Goal:** Google login via Supabase on the frontend, local JWT verification on the backend, `/me` endpoint that upserts the local user row.

**Prerequisite:** Step 03.

## Supabase + Google setup (manual, one-time)

1. Create a Supabase project.
2. Google Cloud Console → OAuth consent screen (External, scopes: `openid email profile`) → create OAuth client (Web). Authorized redirect URI: `https://<ref>.supabase.co/auth/v1/callback`.
3. Supabase dashboard → Authentication → Providers → Google → paste client ID + secret.
4. Supabase → Authentication → URL Configuration → Site URL `http://localhost:5173`, redirect allow-list `http://localhost:5173/**`.
5. Copy the project URL, anon key, and JWT secret or JWKS URL into your env files (step 10).

## What to implement

### Backend
- **`app/auth/jwt.py`** — a `verify_token(token)` function. If `SUPABASE_JWKS_URL` is set, use a module-level cached `PyJWKClient` to fetch the signing key (RS256/ES256). Otherwise decode with `SUPABASE_JWT_SECRET` (HS256). Always verify `exp` and `aud == "authenticated"`.
- **`app/auth/deps.py`** — two dependencies:
  - `get_current_user(authorization: Header)` → extract bearer token, call `verify_token`, return a `CurrentUser` dataclass with `id`, `email`, `display_name`, `avatar_url` from claims.
  - `get_db_user(user, session)` → look up `AppUser` by `supabase_id`; if missing, insert from the JWT claims (lazy upsert). Returns the ORM row.
- **`app/routers/me.py`** — `GET /me` protected by `Depends(get_db_user)`, returns the user's profile as JSON.
- Wire the router into `main.py`.

### Frontend
- **`src/lib/supabase.ts`** — `createClient` with `persistSession: true` and `detectSessionInUrl: true`.
- **`src/components/auth/SignIn.tsx`** — one button calling `supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: origin + '/auth/callback' })`.
- **`src/components/auth/Protected.tsx`** — subscribes to `onAuthStateChange`; renders children only when a session exists, otherwise redirects to `/signin`. Shows nothing until the first auth event resolves.
- **`src/lib/http.ts`** — update `apiFetch` to `getSession()`, attach `Authorization: Bearer <access_token>`, and redirect to `/signin` on a 401 response.
- **`src/App.tsx`** — add `/signin`, `/auth/callback` (redirects to `/` after a brief delay), and wrap protected routes in `<Protected>`.

## How to test

- No `Authorization` header → `GET /me` returns **401**.
- Expired token → **401**.
- Valid token → `GET /me` returns **200** with email, and an `app_users` row exists in the database.
- Click "Continue with Google" in the browser → lands on the protected page.
- Sign out → redirected to `/signin`.
- Write a pytest test that constructs a JWT with `pyjwt` (using your JWT secret), sends it as a bearer header to `/me` via `httpx.AsyncClient`, and asserts 200 + user creation. Test expired token → 401.
