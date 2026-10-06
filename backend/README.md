# EasyRenting — Backend

Spring Boot 4 / Java 25 API for **EasyRenting**, a broker-free rental marketplace (NoBroker-style). It covers
listings, PostGIS geo search, natural-language search powered by Claude (with a rule-based fallback),
shortlists, visit scheduling, real-time chat over STOMP/WebSocket, owner KYC verification and an admin console.

The HTTP/WebSocket contract lives in [`../docs/API.md`](../docs/API.md). This service implements it exactly.

## Tech stack

| Concern | Choice |
|---|---|
| Runtime | Java 25, Spring Boot 4.1 (Spring Framework 7, Spring Security 7, Hibernate 7, Jackson 3), virtual threads |
| Database | PostgreSQL 17 + PostGIS 3.5, Flyway migrations, `ddl-auto=validate` |
| Search | Native SQL via `JdbcClient`: `ST_DWithin` / `ST_Distance` on a generated `geography` column (GiST), GIN on amenities `text[]`, trigram indexes for text |
| Auth | Stateless JWT (HS256, 15 min) via Spring Security resource server + rotating opaque refresh tokens in an httpOnly cookie |
| Realtime | STOMP over native WebSocket (`/ws`), simple broker, per-user queues |
| AI | Official Anthropic Java SDK, structured outputs, model `claude-opus-5-5` |
| Ops | Actuator (health/info/prometheus), ECS JSON logs in prod, request-id MDC, graceful shutdown, OpenAPI/Swagger UI |
| Tests | JUnit 5, MockMvc, Testcontainers (`postgis/postgis:17-3.5`), `WebSocketStompClient` |

## Running

### Everything with Docker Compose (from the repository root)

```bash
JWT_SECRET=$(openssl rand -base64 48) docker compose up --build
```

Compose runs the backend with `SPRING_PROFILES_ACTIVE=prod,demo`, so demo data is seeded on first start.
API on <http://localhost:8080>, Swagger UI at <http://localhost:8080/swagger-ui.html>.

### Local development

```bash
# 1. Database (host port 5433 — 5432 is often taken by a local Postgres)
docker run -d --name er-pg-dev -p 5433:5432 \
  -e POSTGRES_DB=easyrenting -e POSTGRES_USER=easyrenting -e POSTGRES_PASSWORD=easyrenting \
  postgis/postgis:17-3.5

# 2. App with demo data
SPRING_PROFILES_ACTIVE=demo ./mvnw spring-boot:run

# Optional: enable Claude-powered search
ANTHROPIC_API_KEY=sk-ant-... SPRING_PROFILES_ACTIVE=demo ./mvnw spring-boot:run
```

No Docker Compose? `./mvnw spring-boot:test-run` starts the app against a throwaway Testcontainers database
(`TestEasyrentingBackendApplication`).

### Demo accounts (`demo` profile, password `Password@123`)

| Email | Role | Notes |
|---|---|---|
| `admin@easyrenting.in` | ADMIN | |
| `owner@easyrenting.in` | OWNER | verified, ~30 listings |
| `owner2@easyrenting.in` | OWNER | verified, ~30 listings |
| `newowner@easyrenting.in` | OWNER | verification PENDING with Aadhaar + PAN; 2 listings hidden until approved |
| `tenant@easyrenting.in` | TENANT | has conversations, visits (requested/confirmed/completed), shortlist, notifications |

61 public listings across Bengaluru (Koramangala, HSR Layout, Indiranagar, Whitefield, Marathahalli, BTM Layout,
Electronic City, Bellandur), Mumbai (Andheri, Powai, Bandra) and Pune (Hinjewadi, Baner, Kharadi). The seeder is
deterministic and idempotent (skips if the admin exists).

## Profiles

| Profile | Purpose |
|---|---|
| *(default)* | Local development: DB `jdbc:postgresql://localhost:5433/easyrenting` (`easyrenting`/`easyrenting`), dev-only JWT secret fallback, human-readable logs with `[requestId]`. |
| `demo` | Seeds demo accounts, listings and activity. Combine with any other profile (e.g. `prod,demo`). |
| `prod` | All connection settings and secrets **must** come from the environment (no fallbacks), `Secure` cookies by default, ECS-JSON structured logs, larger pool. |
| `test` | Used by the test suite: rate limiting off, temp upload dir, fixed test secret. |

## Environment variables

| Variable | Required | Default (non-prod) | Description |
|---|---|---|---|
| `DB_URL` | prod | `jdbc:postgresql://localhost:5433/easyrenting` | JDBC URL |
| `DB_USERNAME` | prod | `easyrenting` | DB user |
| `DB_PASSWORD` | prod | `easyrenting` | DB password |
| `JWT_SECRET` | prod | dev-only value | HS256 key, **≥ 32 bytes**; startup fails otherwise |
| `ANTHROPIC_API_KEY` | no | *(blank)* | Enables Claude query parsing; blank ⇒ rule-based parser |
| `CORS_ALLOWED_ORIGINS` | no | `http://localhost:3000` | Comma-separated origin patterns; also used for WebSocket allowed origins |
| `COOKIE_SECURE` | no | `false` (`true` in prod) | `Secure` flag of the `er_refresh` cookie |
| `STORAGE_LOCAL_DIR` | no | `./data/uploads` (`/app/data/uploads` in Docker) | Upload root for `LocalStorageService` |
| `TRUST_PROXY` | no | `false` | Honour `X-Forwarded-For` for rate limiting (only behind a trusted proxy) |
| `SPRING_PROFILES_ACTIVE` | no | — | e.g. `prod,demo` |

## Architecture

Package-by-feature under `com.easyrenting`; each feature owns its controller → service → repository slice.
Controllers are thin (DTO records in/out, `@Valid`), services own transactions, business rules and authorization,
repositories are Spring Data JPA (plus `JdbcClient` for geo search).

```
com.easyrenting
├── auth           JWT issue/verify, refresh-token rotation + reuse detection, cookie, STOMP CONNECT auth, 401/403 handlers
├── user           User aggregate (role, verification state, suspension), /users/me
├── property       Listings + images, the single PropertyVisibility rule, mappers
├── search         Geo/filter search (PropertySearchRepository), map pins, locality gazetteer + autocomplete
├── ai             QueryParser (Claude + rules), output sanitizer, explanation builder, AI search orchestration
├── shortlist      Tenant shortlists and the `shortlisted` flag lookup
├── visit          Visit aggregate, explicit state machine, slot policy, notifications
├── chat           Conversations/messages (REST + STOMP), after-commit WebSocket delivery
├── notification   Persisted notifications + after-commit WebSocket push
├── verification   Owner KYC documents and submit/approve/reject workflow
├── admin          Stats, verification queue, user suspension, listing moderation
├── storage        StorageService (local FS), magic-byte type detection, access-checked file serving
├── common         ApiException/ErrorCode, ProblemDetail handler, paging, request-id filter, rate limiter, BaseEntity
├── config         Security, CORS, WebSocket, OpenAPI, JPA auditing, typed AppProperties
└── seed           Demo data (profile `demo`)
```

Notable design points:

- **Visibility rule in one place.** `PropertyVisibility` defines “ACTIVE ∧ not deleted ∧ owner VERIFIED ∧ owner not
  suspended” once each as SQL, JPQL and a Java predicate; every public read path uses it.
- **Geo search.** `properties.location` is a `GENERATED ALWAYS … STORED` `geography(Point,4326)` column (GiST
  indexed, not mapped in JPA). Queries are assembled from whitelisted fragments with named parameters only; sort
  options map to fixed `ORDER BY` clauses. `RELEVANCE` resolves to distance for geo searches, newest otherwise. A
  `tenantPreference` filter also matches listings open to `ANY` tenant.
- **Entities** use application-assigned UUIDs (via `Persistable`, so new entities are persisted, not merged),
  audited timestamps, and `@Version` optimistic locking on `Property` and `Visit`.
- **Events after commit.** Notifications and chat messages are published as domain events and delivered over
  WebSocket by `@TransactionalEventListener(AFTER_COMMIT)`, so clients never see rolled-back data.
- **Errors** are always `application/problem+json` with `type`, `title`, `status`, `detail`, `instance`, `code`
  and, for validation, `errors[]` — including 401/403 from the security chain and 429 from the rate limiter.
- **Uploads** are type-checked by magic bytes (JPEG/PNG/WebP for images, PDF/JPEG/PNG for KYC), size-limited,
  stored under random keys, and path traversal is rejected. `public/…` files are served with a 1-year immutable
  cache; `private/verification/{ownerId}/…` only to that owner or an admin (`no-store`).

## Authentication details

- `POST /auth/login|register|refresh` return `{ accessToken, expiresIn, user }` and set
  `er_refresh=<opaque>; Path=/api/v1/auth; HttpOnly; SameSite=Lax; Max-Age=2592000` (+ `Secure` when enabled).
- Refresh tokens are 256-bit random values stored as SHA-256 hashes, rotated on every refresh. Presenting an
  already-rotated token revokes the whole token family (theft detection); logout revokes the token and clears the
  cookie. Suspending a user revokes all their refresh tokens.
- Coarse role gates are enforced at the URL layer (so wrong-role callers get 403 before body validation) and again
  with `@PreAuthorize`; ownership/participation checks live in the services.

## WebSocket

Connect a STOMP client to `ws://<host>:8080/ws` (native WebSocket, no SockJS) with the CONNECT header
`Authorization: Bearer <accessToken>`. Invalid tokens get an ERROR frame and the connection is closed. Clients may
only subscribe to their own `/user/queue/**` destinations: `messages`, `typing`, `read-receipts`, `notifications`,
`errors`. Send to `/app/chat.send`, `/app/chat.typing`, `/app/chat.read`; participation is checked on every frame
and failures are reported on `/user/queue/errors` as `{ code, message }`.

## AI search: how parsing works

`POST /api/v1/search/ai` → `AiSearchService`:

1. **Parse.** If `ANTHROPIC_API_KEY` is set, `ClaudeQueryParser` calls `claude-opus-5-5` through the Anthropic
   Java SDK with **structured outputs**: the response is constrained to the `AiExtraction` record schema (field
   descriptions carry the enum vocabularies). Effort is `LOW` for latency, the client has a 15 s timeout and one
   retry. The system prompt (domain conventions: `k`/`lakh`, `1RK = 0 BHK`, furnishing semantics, amenity
   synonyms, canonical city names, relative dates…) is static; today's date and whether the user's location is
   available go in the user message so the prompt stays cache-stable.
2. **Sanitize.** Model output is untrusted: `AiExtractionSanitizer` clamps rents/radius, drops unknown enum values,
   rejects malformed or implausible dates, trims text and canonicalises city/locality names.
3. **Fallback.** Any SDK error (rate limit, API error, timeout/IO), a `refusal` or `max_tokens` stop reason, or
   unusable output raises `AiParsingException`; the request is then parsed by `RuleBasedQueryParser` and
   `parser` is reported as `RULES`. Without an API key the rule parser is used directly.
4. **Cache.** Successful AI parses are cached (Caffeine, TTL `app.ai.cache-ttl` = 1 h) keyed by the normalised
   query + user location rounded to ~1 km.
5. **Geocode & search.** A named locality is resolved against the bundled gazetteer
   (`resources/gazetteer/localities.json`, 64 localities across Bengaluru, Mumbai, Pune, Hyderabad, Delhi NCR and
   Chennai) to a point with a 3 km default radius; unknown localities fall back to `locality ILIKE`. The normal
   search then runs and the response carries `filters`, `explanation`, `parser` and the first results page.

Interpretation choices shared by both parsers: plain “furnished” = `FULLY_FURNISHED` + `SEMI_FURNISHED`;
“1RK” = `bhk 0`, “studio” = property type `STUDIO`; “bachelors” without a gender = `BACHELOR_MALE`; a bare amount with
a unit (“30k”) is a maximum; comparator amounts without a unit under 1000 are thousands (“under 25” = ₹25,000);
“near me” uses the caller's coordinates (5 km) only when no locality is named; “ready to move” = available by today.

## Rate limits

In-memory token buckets per client IP: `POST /auth/login` and `POST /auth/register` 10/min each,
`POST /search/ai` 20/min. Exceeding returns `429` problem with `code: RATE_LIMITED` and `Retry-After`.
Buckets are per instance — use a shared store (e.g. Redis/Bucket4j) if you scale horizontally.

## Tests

```bash
./mvnw verify      # unit tests (surefire) + Testcontainers integration tests (failsafe, *IT); needs Docker
```

- Unit: rule-based query parser (28 cases), visit state machine (exhaustive), JWT service, AI output sanitizer.
- Integration: auth flow (rotation, reuse detection, logout, suspension), property CRUD + authorization + images,
  geo radius search + filters + visibility + AI search, visit lifecycle, owner verification + admin approval,
  chat REST, and STOMP over a real WebSocket.

`scripts/smoke-test.sh` exercises a running demo instance end to end (`BASE_URL` overridable;
`CHECK_RATE_LIMIT=0` skips the final login-burst probe, which blocks logins from your IP for a minute).

## Operations

- Health: `/actuator/health` (liveness/readiness groups), metrics: `/actuator/prometheus`. Both are public —
  restrict them at the ingress in production.
- Every response carries `X-Request-Id` (propagated if supplied); it is in the MDC as `requestId` and therefore in
  every log line.
- Graceful shutdown (30 s), `server.forward-headers-strategy=framework`, multipart limits 5 MB/file, 80 MB/request.
- Docker image: multi-stage, layered Spring Boot jar, non-root `app` user (uid 10001) owning `/app/data`, `curl`
  healthcheck on `/actuator/health`.
