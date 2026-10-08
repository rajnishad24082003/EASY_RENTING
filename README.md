# EasyRenting

A full-stack, zero-brokerage rental marketplace in the style of NoBroker. Tenants find homes from **verified owners**
using geo search or plain-English **AI search**, chat with owners in **real time**, and schedule visits.

**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · TanStack Query · Leaflet ·
Spring Boot 4 · Java 25 · Spring Security (JWT) · STOMP over WebSocket · PostgreSQL 17 + PostGIS · Flyway ·
Claude API · Testcontainers · Docker · GitHub Actions

## Features

- **Geo search.** PostGIS radius filtering (`ST_DWithin` on a GiST-indexed `geography` column) and distance sorting,
  plus rent, BHK, type, furnishing, tenant-preference and amenity filters. The search page has a synced map,
  "search this area" and shareable URL state.
- **AI semantic search.** A query like *"2 BHK furnished near Koramangala under 35k for family with parking"* is
  parsed into structured filters by Claude using structured outputs. Locality names are geocoded so the query becomes
  a real radius search. The extracted filters appear as editable chips. A deterministic rule-based parser takes over
  when no API key is set or the AI call fails.
- **Real-time chat.** STOMP over WebSocket with JWT authentication on CONNECT, typing indicators, read receipts and
  live unread counts. Messages are persisted first and pushed after the transaction commits. There is a REST fallback
  when the socket is down.
- **Visit scheduling.** An explicit state machine: request → confirm / decline / propose a new time → complete or
  cancel. Each party is notified live, and phone numbers are revealed only after a visit is confirmed.
- **Role-based access.** `TENANT`, `OWNER` and `ADMIN` roles. Short-lived access tokens are kept in memory; refresh
  tokens are rotated, stored hashed, sent as an httpOnly cookie, and reuse of a rotated token revokes the session.
- **Owner verification against fraudulent listings.** Owners upload identity documents to private storage and admins
  approve or reject them. A listing is public only when its owner is verified and not suspended, a rule enforced in a
  single SQL predicate.
- **Admin console.** Platform stats, verification queue, user suspension and listing moderation.
- **Production concerns.** RFC 9457 problem+json errors, rate limiting, request-ID tracing, Prometheus metrics,
  OpenAPI/Swagger, Flyway migrations, multi-stage non-root Docker images and CI.

## Quick start (Docker)

```bash
cp .env.example .env          # then set JWT_SECRET (openssl rand -base64 48)
docker compose up --build
```

| Service | URL |
|---|---|
| Web app | http://localhost:3000 |
| API | http://localhost:8080/api/v1 |
| Swagger UI | http://localhost:8080/swagger-ui.html |
| PostgreSQL | localhost:5433 (`easyrenting` / `easyrenting`) |

The first start seeds demo data: about 60 listings across Bengaluru, Mumbai and Pune, plus sample chats and visits.
Every demo account uses the password `Password@123`:

| Role | Email |
|---|---|
| Tenant | `tenant@easyrenting.in` |
| Owner (verified) | `owner@easyrenting.in`, `owner2@easyrenting.in` |
| Owner (pending verification) | `newowner@easyrenting.in` |
| Admin | `admin@easyrenting.in` |

To enable Claude-powered search, set `ANTHROPIC_API_KEY` in `.env`. Without it the rule-based parser is used, and the
UI labels results as *Smart rules* instead of *AI*.

## Local development

```bash
# 1. Database
docker run -d --name er-pg-dev -p 5433:5432 \
  -e POSTGRES_DB=easyrenting -e POSTGRES_USER=easyrenting -e POSTGRES_PASSWORD=easyrenting \
  postgis/postgis:17-3.5

# 2. Backend (http://localhost:8080)
cd backend
SPRING_PROFILES_ACTIVE=demo ./mvnw spring-boot:run

# 3. Frontend (http://localhost:3000)
cd frontend
npm install
npm run dev
```

The frontend proxies `/api/*` to the backend through Next.js rewrites, so the refresh cookie is first-party. The
browser connects to the WebSocket directly at `NEXT_PUBLIC_WS_URL` (default `ws://localhost:8080/ws`).

## Tests

| Command | What it runs |
|---|---|
| `cd backend && ./mvnw verify` | Unit tests plus Testcontainers integration tests on PostGIS: auth, geo search, visits, verification, chat and STOMP |
| `cd frontend && npm run lint && npm run typecheck && npm test` | ESLint, TypeScript and Vitest unit/component tests |
| `cd frontend && npm run e2e` | Playwright end-to-end tests against a running, demo-seeded stack. Includes a two-browser tenant ↔ owner real-time flow |

## Repository layout

```
backend/    Spring Boot API: package-by-feature (auth, property, search, ai, chat, visit, verification, admin, …)
frontend/   Next.js app: thin routes in src/app, domain logic in src/features/<domain>
docs/       API.md (API contract), ARCHITECTURE.md (design decisions and diagram)
.github/    CI: backend verify, frontend lint/typecheck/test/build, Docker image builds
```

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): system diagram and the reasoning behind key decisions.
- [docs/API.md](docs/API.md): REST and WebSocket contract, business rules and enums.
- [backend/README.md](backend/README.md): profiles, environment variables, AI parsing internals, operations.
- [frontend/README.md](frontend/README.md): structure, auth, WebSocket and query layers, environment variables.
- [deploy/README.md](deploy/README.md): free deployment on Oracle Cloud Always Free with automatic HTTPS.

## License

**Copyright (c) 2026 Raj Nishad. All Rights Reserved.**

This is **not** open-source software. The code is public for viewing only.
Copying, modifying, redistributing, deploying, or claiming any part of this
project as your own is prohibited without written permission.
See [LICENSE](LICENSE) for full terms.
