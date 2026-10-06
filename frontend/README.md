# EasyRenting — Frontend

Next.js 16 (App Router, Turbopack) + React 19 + TypeScript (strict) + Tailwind CSS v4 frontend for EasyRenting,
a zero-brokerage rental marketplace. It is built against the API contract in [`../docs/API.md`](../docs/API.md).

## Quick start

```bash
cp .env.example .env.local      # adjust if the backend isn't on localhost:8080
npm install
npm run dev                     # http://localhost:3000
```

The backend must be running for data to load. With the backend's `demo` profile you can log in as
`tenant@easyrenting.in`, `owner@easyrenting.in` or `admin@easyrenting.in` (password `Password@123`); the login page
has one-click buttons for these.

## Scripts

| Script                        | What it does                                                                                         |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| `npm run dev`                 | Dev server (Turbopack)                                                                               |
| `npm run build` / `npm start` | Production build (`output: "standalone"`) / serve it                                                 |
| `npm run lint`                | ESLint (Next core-web-vitals + TypeScript + React Compiler rules)                                    |
| `npm run typecheck`           | Generates route types (`next typegen`) and runs `tsc --noEmit`                                       |
| `npm test`                    | Vitest + Testing Library unit/component tests (jsdom)                                                |
| `npm run e2e`                 | Playwright specs in `e2e/` (needs the full stack; starts `npm run dev` unless `E2E_BASE_URL` is set) |

## Environment variables

| Variable             | Used by                                                 | Default                  | Notes                                                                                                                                                                                           |
| -------------------- | ------------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BACKEND_URL`        | `next.config.ts` rewrites, server-side metadata fetches | `http://localhost:8080`  | Origin of the Spring Boot API. `/api/*` is proxied to `${BACKEND_URL}/api/*` so the httpOnly `er_refresh` cookie is same-origin. **Baked in at build time** for standalone builds (see Docker). |
| `NEXT_PUBLIC_WS_URL` | STOMP client (browser)                                  | `ws://localhost:8080/ws` | Inlined into the client bundle at build time. The browser connects to the backend directly (no proxy).                                                                                          |
| `E2E_BASE_URL`       | Playwright                                              | `http://localhost:3000`  | Point e2e tests at an already running deployment.                                                                                                                                               |

## Docker

```bash
docker build -t easyrenting-frontend \
  --build-arg BACKEND_URL=http://backend:8080 \
  --build-arg NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws .
docker run -p 3000:3000 easyrenting-frontend
```

Multi-stage (`node:24-alpine`), runs the standalone `server.js` as a non-root user. Because Next.js evaluates
`rewrites()` during `next build` in standalone mode, `BACKEND_URL` is a **build arg** (default `http://backend:8080`,
i.e. a `backend` service on the same Compose network). It is also set as a runtime env var for the server-side
metadata fetch on `/properties/[id]`. `NEXT_PUBLIC_WS_URL` must be reachable _from the browser_ (e.g. the host-mapped
backend port), not the internal Docker hostname.

## Project structure

```
src/
  app/                       # Routes only — thin server components exporting metadata
    (marketing)/             # Header + footer: /, /properties/[id], /login, /register
    (app)/                   # Header only: /search, /dashboard/*, /messages/*, /admin/*
    layout.tsx, error.tsx, not-found.tsx, loading.tsx, icon.svg
  components/
    ui/                      # In-house UI kit (Button, Input, Select, Dialog/Sheet, Tabs, Badge, Pagination, …)
    layout/                  # Header, footer, sidebars, dashboard/admin shells
    map/                     # Leaflet helpers (always loaded with next/dynamic, ssr: false)
    providers.tsx            # QueryClient → Auth → WebSocket providers + toaster
  features/<domain>/         # Feature modules: components + hooks + query keys (+ pure logic & tests)
    search/  properties/  listings/  shortlist/  visits/  chat/  notifications/
    verification/  admin/  auth/  profile/
  hooks/                     # Generic hooks (debounce, media query, geolocation)
  lib/
    api/                     # Typed fetch client, ProblemDetail errors, DTO types, per-domain API modules
    auth/                    # In-memory session store, AuthProvider, useAuth, RequireAuth
    ws/                      # STOMP provider + realtime → query-cache handlers
    format.ts, labels.ts, navigation.ts, forms.ts, query-client.ts, protected-files.ts
e2e/                         # Playwright specs
```

## Architecture

### API client (`src/lib/api`)

- `apiRequest<T>(path, options)` wraps `fetch` for `/api/v1`: JSON or multipart bodies, repeated query keys for
  arrays (`bhk=1&bhk=2`), `credentials: "include"`, and typed responses (`types.ts` mirrors every DTO/enum in the
  contract).
- Non-2xx responses throw `ApiError`, parsed from RFC 9457 ProblemDetail (`status`, `code`, `detail`,
  `errors[]`). `applyApiFieldErrors()` maps `errors[]` onto react-hook-form fields; anything unmapped becomes a
  toast. Mutations toast errors globally (via `MutationCache`) unless they set `meta.skipGlobalError`.
- In the browser requests are same-origin (`/api/v1/...`, proxied by the Next.js rewrite). On the server they
  go straight to `BACKEND_URL`.

### Auth

- The access token lives **only in memory** (`sessionStore`, consumed through `useSyncExternalStore`). The refresh
  token is the backend's httpOnly `er_refresh` cookie.
- On boot `AuthProvider` calls `POST /auth/refresh` to restore the session silently. Requests issued while that
  is in flight wait for it, so the first queries already carry the token (e.g. correct `shortlisted` flags).
- On a `401`, the client calls `refreshSession()` **once** and retries. `refreshSession` is wrapped in
  `singleFlight`, so concurrent 401s share one refresh. This matters because the backend rotates the refresh
  token on every call. If the refresh fails, the session is cleared (logged out).
- The token is also refreshed proactively ~60 s before `expiresIn` elapses. When the signed-in identity changes,
  all queries are reset.
- Route protection is client-side: `<RequireAuth roles={[…]}>` redirects anonymous users to `/login?next=…` and shows
  a "no access" state for the wrong role. `next` is sanitised to same-origin relative paths.

### Server state (TanStack Query v5)

- Each feature has a query-key factory (`features/*/keys.ts`, e.g. `searchKeys.results(query)`,
  `chatKeys.messages(id)`). Mutations invalidate or patch exactly the affected keys (for example, a shortlist
  toggle optimistically flips `shortlisted` in search results and the detail cache).
- Search state lives in the URL (`features/search/filters.ts`: parse, sanitise, stable serialisation, API mapping,
  removable chips). AI search (`POST /search/ai`) navigates to `/search?<filters>&ai=<query>`. The filter panel
  then shows the parsed filters, and the explanation and `AI`/`Smart rules` badge are read from the query cache.

### Realtime (`src/lib/ws`)

- One STOMP connection per signed-in user (`@stomp/stompjs`, native WebSocket to `NEXT_PUBLIC_WS_URL`).
  `beforeConnect` injects `Authorization: Bearer <token>` on every (re)connect, refreshing first if the token is
  missing or about to expire. Reconnects use exponential backoff (2 s → 60 s). A STOMP `ERROR` frame forces a
  token refresh.
- Subscriptions and their effect on the cache:
  - `/user/queue/messages`: upserts into the thread cache, reconciling optimistic messages.
  - `/user/queue/read-receipts`: sets `readAt` on messages.
  - `/user/queue/typing`: drives the typing indicator.
  - `/user/queue/notifications`: bumps the unread count, invalidates visits/verification as appropriate, and shows
    a toast.
  - `/user/queue/errors`: shows a toast.

  After a reconnect, the chat and notification queries are refetched to catch up.

- Sending chat messages is optimistic over `/app/chat.send`. If the socket is down, the client falls back to
  `POST /conversations/{id}/messages`. Messages that aren't acknowledged within 10 s are marked failed and can be
  retried.

### Maps

Leaflet + OpenStreetMap tiles (no API key), always loaded with `next/dynamic({ ssr: false })`. Pins are `DivIcon`s
showing compact rent labels (`₹25K`). The search map draws the radius circle and offers "Search this area"
after the user pans.

## Contract assumptions

These are interpretations of `docs/API.md` that integration should confirm:

1. **Visit time zone**: slots are built in IST (`+05:30`) and sent as UTC instants. Bookable starts are
   08:00–19:30 in 30-minute steps (a visit starting exactly at 20:00 is treated as outside the window).
2. **Visit tabs**: "Upcoming" uses `status=CONFIRMED&upcoming=true` for tenants. For owners it uses
   `status=CONFIRMED` without `upcoming`, so past confirmed visits can still be marked complete.
3. **AI filters**: when `/search/ai` returns both `locality` and `lat`/`lng`, the locality is treated as the label
   of the geocoded point and is not also sent as a `locality` text filter. The `results` page of the AI response
   is not used; the list re-queries `GET /search/properties` with the applied filters, so it stays consistent with
   pagination and sorting.
4. **`PUT /properties/{id}`**: the client re-sends `status` when it is `DRAFT`/`ACTIVE`, so the documented
   "default ACTIVE" can't publish a draft. It omits `status` for `RENTED`/`INACTIVE` and expects the backend to
   keep the current value.
5. **New listings** are created as `DRAFT` at the end of the Pricing step (an id is required to upload photos).
   They are published from the Review step via `PATCH /properties/{id}/status`.
6. **Image count**: `PropertySummaryDto` has no image count, so "My listings" flags listings without a cover image
   ("No photos") instead of showing a count.
7. **Private files**: verification document URLs are fetched with the bearer token and opened as blob URLs,
   because a plain link can't carry the header and the refresh cookie is scoped to `/api/v1/auth`.
8. **Notifications**: `NEW_MESSAGE` pushes only refresh chat counters (they are not persisted) and are suppressed
   while the matching conversation is open. Other types increment `/notifications/unread-count` locally.
9. `link` in `NotificationDto` is treated as a frontend route (navigated to with the router).
