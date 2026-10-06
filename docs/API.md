# EasyRenting API Contract (v1)

Single source of truth shared by `backend/` and `frontend/`. Base path: `/api/v1`.
All JSON is camelCase. Timestamps are ISO-8601 UTC strings (`Instant`). Dates are `YYYY-MM-DD`.
IDs are UUID strings. Money is integer rupees (`long`).

## Conventions

- **Auth header**: `Authorization: Bearer <accessToken>` (JWT, HS256, 15 min TTL, claims: `sub`=userId, `role`, `name`, `email`).
- **Refresh token**: opaque random string, stored *hashed* (SHA-256) in DB, 30-day TTL, rotated on every refresh.
  Sent/received as httpOnly cookie `er_refresh` (Path=`/api/v1/auth`, SameSite=Lax, Secure configurable).
  The frontend proxies `/api/*` through Next.js rewrites, so cookies are same-origin.
- **Errors**: RFC 9457 `application/problem+json`:
  ```json
  { "type": "about:blank", "title": "Bad Request", "status": 400, "detail": "Validation failed",
    "instance": "/api/v1/properties", "code": "VALIDATION_ERROR",
    "errors": [{ "field": "rent", "message": "must be greater than 0" }] }
  ```
  `code` values: `VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `CONFLICT`, `BAD_REQUEST`, `RATE_LIMITED`, `INTERNAL_ERROR`.
- **Pagination**: query `page` (0-based, default 0), `size` (default 20, max 100). Response:
  ```json
  { "content": [...], "page": 0, "size": 20, "totalElements": 134, "totalPages": 7 }
  ```

## Enums

| Enum | Values |
|---|---|
| `Role` | `TENANT`, `OWNER`, `ADMIN` |
| `PropertyType` | `APARTMENT`, `INDEPENDENT_HOUSE`, `VILLA`, `PG`, `STUDIO` |
| `Furnishing` | `UNFURNISHED`, `SEMI_FURNISHED`, `FULLY_FURNISHED` |
| `TenantPreference` | `ANY`, `FAMILY`, `BACHELOR_MALE`, `BACHELOR_FEMALE`, `COMPANY` |
| `PropertyStatus` | `DRAFT`, `ACTIVE`, `RENTED`, `INACTIVE` |
| `Amenity` | `PARKING`, `LIFT`, `POWER_BACKUP`, `GYM`, `SWIMMING_POOL`, `SECURITY`, `WIFI`, `AC`, `GAS_PIPELINE`, `CLUB_HOUSE`, `PLAY_AREA`, `PET_FRIENDLY`, `WASHING_MACHINE`, `FRIDGE` |
| `VerificationStatus` | `UNVERIFIED`, `PENDING`, `VERIFIED`, `REJECTED` |
| `DocumentType` | `AADHAAR`, `PAN`, `PASSPORT`, `DRIVING_LICENSE`, `PROPERTY_PROOF` |
| `VisitStatus` | `REQUESTED`, `CONFIRMED`, `RESCHEDULE_PROPOSED`, `REJECTED`, `CANCELLED`, `COMPLETED` |
| `SortBy` | `RELEVANCE`, `DISTANCE`, `RENT_ASC`, `RENT_DESC`, `NEWEST` |

## Business rules

1. A listing is **publicly visible** only if `status = ACTIVE` AND the owner's `verificationStatus = VERIFIED` AND the owner is not suspended.
   Owners may create listings any time (they go public automatically once verified).
2. Only `OWNER` can create listings; only the listing's owner (or `ADMIN`) can edit/delete it.
3. Only `TENANT` can request visits and start conversations. A conversation is unique per (property, tenant).
4. Visit slot must be in the future and between 08:00–20:00 local; a tenant may hold at most one non-terminal visit per property.
5. Visit transitions:
   - tenant: `REQUESTED|CONFIRMED|RESCHEDULE_PROPOSED → CANCELLED`; on `RESCHEDULE_PROPOSED` tenant may accept (`→ CONFIRMED`, scheduledAt = proposedAt)
   - owner: `REQUESTED → CONFIRMED | REJECTED | RESCHEDULE_PROPOSED`; `CONFIRMED → COMPLETED` (only after scheduledAt)
   Any other transition → 409 `CONFLICT`.
6. Owner verification: owner uploads ≥1 identity document + submits → `PENDING`. Admin approves → `VERIFIED` or rejects with reason → `REJECTED` (owner may resubmit).
7. Suspended users cannot log in (403) and their listings are hidden.
8. Rate limits (per IP, in-memory token bucket): `/auth/login` & `/auth/register` 10/min; `/search/ai` 20/min. Exceeding → 429 `RATE_LIMITED`.

## Auth — `/api/v1/auth`

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/register` | – | `RegisterRequest` | 201 `AuthResponse` + sets cookie |
| POST | `/login` | – | `LoginRequest` | 200 `AuthResponse` + sets cookie |
| POST | `/refresh` | cookie | – | 200 `AuthResponse` + rotates cookie (401 if invalid) |
| POST | `/logout` | cookie | – | 204, revokes token, clears cookie |

```ts
RegisterRequest { name: string(2..80); email: email; phone: string(/^[6-9]\d{9}$/); password: string(8..72, ≥1 letter & ≥1 digit); role: "TENANT" | "OWNER" }  // ADMIN cannot self-register
LoginRequest    { email: string; password: string }
AuthResponse    { accessToken: string; expiresIn: number /*seconds*/; user: UserDto }
UserDto         { id; name; email; phone; role: Role; verificationStatus: VerificationStatus; avatarUrl: string|null; createdAt }
```

## Users — `/api/v1/users`

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/me` | any | – | `UserDto` |
| PATCH | `/me` | any | `{ name?, phone? }` | `UserDto` |

## Properties — `/api/v1/properties`

| Method | Path | Auth | Body / Query | Response |
|---|---|---|---|---|
| GET | `/{id}` | public* | – | `PropertyDetailDto` (*non-public listings visible only to owner/admin, else 404) |
| GET | `/mine` | OWNER | page,size | `Page<PropertySummaryDto>` (all statuses) |
| POST | `/` | OWNER | `PropertyRequest` | 201 `PropertyDetailDto` |
| PUT | `/{id}` | owner/ADMIN | `PropertyRequest` | `PropertyDetailDto` |
| PATCH | `/{id}/status` | owner/ADMIN | `{ status: PropertyStatus }` | `PropertyDetailDto` |
| DELETE | `/{id}` | owner/ADMIN | – | 204 (soft delete) |
| POST | `/{id}/images` | owner | multipart `files[]` (jpeg/png/webp, ≤5 MB each, ≤15 total per listing) | `PropertyImageDto[]` |
| DELETE | `/{id}/images/{imageId}` | owner | – | 204 |
| PUT | `/{id}/images/{imageId}/cover` | owner | – | 204 |

```ts
PropertyRequest {
  title: string(10..120); description: string(30..5000);
  propertyType: PropertyType; bhk: int(0..10) /*0 = studio/1RK*/; bathrooms: int(1..10);
  areaSqft: int(100..20000); furnishing: Furnishing; tenantPreference: TenantPreference;
  rent: long(1000..10_000_000); deposit: long(0..); maintenance: long(0..);
  availableFrom: date; floor?: int; totalFloors?: int; facing?: string;
  addressLine: string; locality: string; city: string; state: string; pincode: string(/^\d{6}$/);
  latitude: double(-90..90); longitude: double(-180..180);
  amenities: Amenity[]; status?: "DRAFT" | "ACTIVE"   // default ACTIVE
}
PropertyImageDto   { id; url; cover: boolean; sortOrder: int }
OwnerSummaryDto    { id; name; verified: boolean; memberSince }
PropertySummaryDto {
  id; title; propertyType; bhk; bathrooms; areaSqft; furnishing; tenantPreference; rent; deposit;
  locality; city; latitude; longitude; coverImageUrl: string|null; amenities: Amenity[];
  status; availableFrom; createdAt; distanceKm: number|null; ownerVerified: boolean; shortlisted: boolean
}
PropertyDetailDto = PropertySummaryDto & {
  description; maintenance; floor; totalFloors; facing; addressLine; state; pincode;
  images: PropertyImageDto[]; owner: OwnerSummaryDto; viewCount: long; updatedAt
}
```
`shortlisted` is true only when the caller is an authenticated tenant who shortlisted it. Image `url` is absolute-path `/api/v1/files/{key}` or an absolute http(s) URL (seed data).

## Search — `/api/v1/search`

### GET `/properties` (public)
Query params (all optional):
`lat, lng, radiusKm (0.5..50, default 5 when lat/lng present), city, locality, q (free text on title/description/locality),
minRent, maxRent, bhk (repeatable: bhk=1&bhk=2), propertyType (repeatable), furnishing (repeatable), tenantPreference,
amenities (repeatable, ALL must match), availableBefore (date), sort (SortBy, default RELEVANCE → DISTANCE if geo else NEWEST), page, size`

Response: `Page<PropertySummaryDto>` with `distanceKm` filled when lat/lng given.

### GET `/properties/map` (public)
Same filters, no paging, returns up to 500 lightweight pins: `MapPinDto[] { id; latitude; longitude; rent; bhk; title }`.

### POST `/ai` (public, rate-limited)
```ts
AiSearchRequest  { query: string(3..300); lat?: number; lng?: number }   // lat/lng = user's location for "near me"
AiSearchResponse {
  filters: SearchFilters;          // structured filters extracted from the query
  explanation: string;             // one short human-readable sentence, e.g. "2 BHK furnished flats under ₹30,000 near Koramangala"
  parser: "AI" | "RULES";          // RULES when no API key / AI failure
  results: Page<PropertySummaryDto>
}
SearchFilters {
  city?: string; locality?: string; lat?: number; lng?: number; radiusKm?: number;
  minRent?: number; maxRent?: number; bhk?: number[]; propertyType?: PropertyType[];
  furnishing?: Furnishing[]; tenantPreference?: TenantPreference; amenities?: Amenity[];
  availableBefore?: string; keywords?: string; sort?: SortBy
}
```
When the query names a locality ("near Koramangala"), the backend geocodes it against a built-in gazetteer of
well-known localities (lat/lng + default radius 3 km) so that radius filtering applies; otherwise falls back to `locality ILIKE`.
The frontend applies `filters` to its filter panel so users can refine them.

### GET `/localities?q=kor` (public)
Autocomplete from gazetteer + distinct DB localities: `LocalityDto[] { name; city; latitude; longitude }` (max 10).

## Shortlist — `/api/v1/shortlist` (TENANT)

| Method | Path | Response |
|---|---|---|
| GET | `/` | `Page<PropertySummaryDto>` |
| PUT | `/{propertyId}` | 204 |
| DELETE | `/{propertyId}` | 204 |

## Visits — `/api/v1/visits`

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/` | TENANT | `{ propertyId; scheduledAt: Instant; note?: string(..500) }` | 201 `VisitDto` |
| GET | `/` | TENANT/OWNER | query `status?` (repeatable), `upcoming?: boolean`, page,size | `Page<VisitDto>` (tenant: own; owner: for own properties) |
| GET | `/{id}` | participant | – | `VisitDto` |
| POST | `/{id}/confirm` | OWNER | – | `VisitDto` |
| POST | `/{id}/reject` | OWNER | `{ reason?: string }` | `VisitDto` |
| POST | `/{id}/reschedule` | OWNER | `{ proposedAt: Instant; note?: string }` | `VisitDto` |
| POST | `/{id}/accept-reschedule` | TENANT | – | `VisitDto` |
| POST | `/{id}/cancel` | participant | `{ reason?: string }` | `VisitDto` |
| POST | `/{id}/complete` | OWNER | – | `VisitDto` |

```ts
VisitDto { id; property: { id; title; locality; city; coverImageUrl }; tenant: { id; name; phone };
           owner: { id; name; phone }; status: VisitStatus; scheduledAt; proposedAt: string|null;
           note: string|null; responseNote: string|null; createdAt; updatedAt }
```
Phone numbers of the counterparty are only revealed once the visit is `CONFIRMED` or `COMPLETED` (otherwise `null`).
Every visit change pushes a `NotificationDto` to the counterparty over WebSocket.

## Chat — `/api/v1/conversations`

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/` | TENANT | `{ propertyId; message: string(1..2000) }` | 201 `ConversationDto` (returns existing one if present, appending the message) |
| GET | `/` | any | page,size | `Page<ConversationDto>` ordered by lastMessageAt desc |
| GET | `/{id}` | participant | – | `ConversationDto` |
| GET | `/{id}/messages` | participant | `before?: Instant`, `size` (default 30) | `MessageDto[]` newest-last (cursor paging backwards) |
| POST | `/{id}/messages` | participant | `{ content: string(1..2000) }` | 201 `MessageDto` (REST fallback; also broadcast over WS) |
| POST | `/{id}/read` | participant | – | 204, marks all counterparty messages read, pushes read receipt |
| GET | `/unread-count` | any | – | `{ count: number }` |

```ts
ConversationDto { id; property: { id; title; coverImageUrl; rent }; counterpart: { id; name; role };
                  lastMessage: MessageDto|null; unreadCount: number; createdAt }
MessageDto      { id; conversationId; senderId; content; createdAt; readAt: string|null }
```

## Notifications — `/api/v1/notifications`

| Method | Path | Response |
|---|---|---|
| GET | `/` (page,size) | `Page<NotificationDto>` newest first |
| GET | `/unread-count` | `{ count }` |
| POST | `/{id}/read` | 204 |
| POST | `/read-all` | 204 |

```ts
NotificationDto { id; type: "VISIT_REQUESTED"|"VISIT_CONFIRMED"|"VISIT_REJECTED"|"VISIT_RESCHEDULED"|"VISIT_CANCELLED"|"VISIT_COMPLETED"|"VERIFICATION_APPROVED"|"VERIFICATION_REJECTED"|"NEW_MESSAGE";
                  title; body; link: string /* frontend route, e.g. "/dashboard/visits" */; read: boolean; createdAt }
```
`NEW_MESSAGE` is pushed over WS only (not persisted).

## Owner verification — `/api/v1/verification` (OWNER)

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/` | – | `VerificationDto` |
| POST | `/documents` | multipart `file` (pdf/jpeg/png ≤5 MB) + `documentType` | `VerificationDocumentDto` |
| DELETE | `/documents/{docId}` | – | 204 (only while not PENDING) |
| POST | `/submit` | – | `VerificationDto` (needs ≥1 of AADHAAR/PAN/PASSPORT/DRIVING_LICENSE; → PENDING) |

```ts
VerificationDocumentDto { id; documentType; fileName; url; uploadedAt }
VerificationDto { status: VerificationStatus; submittedAt: string|null; reviewedAt: string|null;
                  rejectionReason: string|null; documents: VerificationDocumentDto[] }
```
Document `url` is served only to the owner and admins (`/api/v1/files/{key}` checks access for `private/` keys).

## Admin — `/api/v1/admin` (ADMIN)

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/stats` | – | `{ totalUsers; totalOwners; totalTenants; verifiedOwners; pendingVerifications; activeListings; totalListings; visitsThisWeek; messagesThisWeek }` |
| GET | `/verifications` | `status` (default PENDING), page,size | `Page<AdminVerificationDto>` |
| POST | `/verifications/{ownerId}/approve` | – | `AdminVerificationDto` |
| POST | `/verifications/{ownerId}/reject` | `{ reason: string(5..500) }` | `AdminVerificationDto` |
| GET | `/users` | `q?`, `role?`, page,size | `Page<AdminUserDto>` |
| POST | `/users/{id}/suspend` / `/unsuspend` | – | `AdminUserDto` |
| GET | `/properties` | `q?`, `status?`, page,size | `Page<PropertySummaryDto>` |
| PATCH | `/properties/{id}/status` | `{ status }` | `PropertySummaryDto` |

```ts
AdminVerificationDto { owner: UserDto; verification: VerificationDto; listingCount: number }
AdminUserDto = UserDto & { suspended: boolean; listingCount: number }
```

## Files — `/api/v1/files/{*key}`
Public keys (`public/...`) served to anyone with long cache headers. Private keys (`private/verification/{ownerId}/...`) only to that owner or ADMIN.
Storage is pluggable (`StorageService`): local filesystem by default (`app.storage.local-dir`).

## WebSocket (STOMP)

- Endpoint: `ws://<backend>/ws` (native WebSocket, no SockJS). Frontend connects directly to `NEXT_PUBLIC_WS_URL`.
- CONNECT frame must include header `Authorization: Bearer <accessToken>`; invalid → ERROR frame + close.
- Client → server:
  - `/app/chat.send` payload `{ conversationId; content }` → persisted, delivered to both participants.
  - `/app/chat.typing` payload `{ conversationId; typing: boolean }` → forwarded to counterpart.
  - `/app/chat.read` payload `{ conversationId }` → same as REST `/read`.
- Server → client (subscribe with `/user/...`):
  - `/user/queue/messages` → `MessageDto`
  - `/user/queue/typing` → `{ conversationId; userId; typing }`
  - `/user/queue/read-receipts` → `{ conversationId; readerId; readAt }`
  - `/user/queue/notifications` → `NotificationDto`
  - `/user/queue/errors` → `{ code; message }`

## Health & docs
- `GET /actuator/health` (public), Prometheus at `/actuator/prometheus`.
- OpenAPI JSON `/v3/api-docs`, Swagger UI `/swagger-ui.html`.

## Demo accounts (seeded under the `demo` profile; password `Password@123`)
- `admin@easyrenting.in` (ADMIN)
- `owner@easyrenting.in` (OWNER, VERIFIED), `owner2@easyrenting.in` (OWNER, VERIFIED), `newowner@easyrenting.in` (OWNER, PENDING with docs)
- `tenant@easyrenting.in` (TENANT)
~60 ACTIVE listings across Bengaluru (Koramangala, HSR Layout, Indiranagar, Whitefield, Marathahalli, BTM Layout, Electronic City, Bellandur),
Mumbai (Andheri, Powai, Bandra) and Pune (Hinjewadi, Baner, Kharadi) with realistic coordinates, rents, amenities and image URLs from `images.unsplash.com`.
