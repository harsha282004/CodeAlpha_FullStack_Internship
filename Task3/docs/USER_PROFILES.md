# TaskFlow — User Profiles (Phase 5)

This document covers the user-profile module: public profile lookup, the
authenticated user's own profile, profile editing, and user search. For
where this fits in the overall system, see
[ARCHITECTURE.md](./ARCHITECTURE.md#17-api-organization). For authentication
itself (registration, login, JWT, `requireAuth`), see
[AUTHENTICATION.md](./AUTHENTICATION.md) — this module builds directly on
top of it and does not repeat that detail here.

Scope: profile viewing, editing, and search only. There is still no
authorization system (project roles), no email/password changes, and no
frontend profile UI — those are later phases. Everything below works
independently through the REST API, backed by the same `User` model from
Phase 2 — no new tables, no migration.

## File layout

```
server/src/
├── controllers/profile.controller.js   — thin: validate → call service → respond
├── routes/profile.routes.js            — GET /search, GET /me, PATCH /me, GET /:username
├── services/profile.service.js         — all database access + business logic
├── validators/profile.validator.js     — update-body and search-query validation
└── utils/user.js                       — extended (Phase 4) with toPublicUser(),
                                           PUBLIC_USER_SELECT, PRIVATE_USER_SELECT
```

Same layered flow as every other route in this project:

```
Route → Controller → Service → Prisma → PostgreSQL
```

## Routes

Mounted at `/api/users` (`server/src/routes/index.js`):

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/users/search?q=&page=&limit=` | no | Search users by username/name |
| `GET` | `/api/users/me` | **`requireAuth`** | The caller's own profile |
| `PATCH` | `/api/users/me` | **`requireAuth`** | Partial update to the caller's own profile |
| `GET` | `/api/users/:username` | no | Anyone's public profile |

### Route order matters

`profile.routes.js` registers `/search` and `/me` **before** the
`/:username` catch-all:

```js
router.get('/search', searchUsersController)
router.get('/me', requireAuth, getCurrentProfileController)
router.patch('/me', requireAuth, updateCurrentProfileController)
router.get('/:username', getPublicProfileController)   // must come last
```

If `/:username` were registered first, Express would match
`GET /api/users/search` or `GET /api/users/me` as a lookup for a literal
username `"search"` or `"me"` and never reach the real handlers. This was
confirmed during testing: requesting `/api/users/me` with no token returns
`401 AUTHENTICATION_REQUIRED` (proving it hit `requireAuth`) rather than
`404 USER_NOT_FOUND` (which is what a username-lookup miss would return) —
if the ordering were wrong, the second response is what you'd see instead.

## Public profile

`GET /api/users/:username` — no authentication required.

The `:username` segment is normalized (trimmed, lowercased) before the
lookup, since usernames are always stored lowercase — so
`/api/users/Alice_Johnson` resolves the same as `/api/users/alice_johnson`.

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "a0000000-0000-4000-8000-000000000001",
      "name": "Alice Johnson",
      "username": "alice_johnson",
      "bio": "Product manager keeping every roadmap honest.",
      "avatarUrl": "https://picsum.photos/seed/alice-johnson/200/200",
      "createdAt": "2026-09-15T15:59:16.403Z"
    }
  }
}
```

No `email`, no `updatedAt`, no `passwordHash` — see
[Safe serialization](#safe-serialization). Nonexistent username:

```json
{ "success": false, "message": "User not found", "code": "USER_NOT_FOUND" }
```
— `404`, not a generic `500`.

## Current-user profile

`GET /api/users/me` — requires `Authorization: Bearer <token>`.

Identity comes exclusively from `req.user.id`, set by `requireAuth` from
the verified JWT — never from a body, query, or path parameter. There is no
way for a client to ask for "my profile" as anyone but themselves.

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...", "name": "...", "username": "...", "email": "...",
      "bio": null, "avatarUrl": null,
      "createdAt": "...", "updatedAt": "..."
    }
  }
}
```

This is the *private* view: it includes `email` and `updatedAt` (which the
public view omits) but still never `passwordHash`. If the token is valid
but the account it points to no longer exists, the response is the same
generic `401 AUTHENTICATION_REQUIRED` used everywhere else a token doesn't
resolve to a real, current user — not a `404`, since from the caller's side
this looks like "you aren't authenticated," not "resource missing."

## Profile update

`PATCH /api/users/me` — requires `Authorization: Bearer <token>`. Always
updates `req.user.id`; there is no `PATCH /api/users/:id`.

### Supported fields (all optional, partial updates)

| Field | Rule |
|---|---|
| `name` | non-empty string after trim, ≤100 characters |
| `username` | matches `^[a-z0-9_]{3,30}$` **before** lowercasing (same rule, same reasoning, as registration — see [AUTHENTICATION.md](./AUTHENTICATION.md#validation-rules)) |
| `bio` | trimmed, ≤500 characters; an explicitly empty string clears it (`null`) |
| `avatarUrl` | trimmed, ≤2048 characters, must start with `http://` or `https://`; an explicitly empty string clears it (`null`) |

**Everything else is rejected, not ignored.** `email`, `password`,
`passwordHash`, `id`, `createdAt`, `updatedAt`, or any field not in the list
above produces a `400` naming the offending field(s) — the request is never
silently partially applied while quietly dropping a field the caller
expected to take effect.

```json
{ "success": false, "message": "The following field(s) cannot be updated here: email", "code": "VALIDATION_ERROR" }
```

An empty body is also a `400` (`"Request body must include at least one field to update"`)
— there's nothing to do, so it isn't treated as a no-op success.

### Partial-update semantics

```json
{ "bio": "Building full-stack applications." }
```

updates only `bio`; `name`, `username`, and `avatarUrl` are left exactly as
they were. Verified during testing across five separate single/multi-field
PATCH requests in sequence, each preserving every previously-set field.

### Username uniqueness

Changing `username` to one already taken by a different account:

```json
{ "success": false, "message": "Username is already taken", "code": "USERNAME_ALREADY_EXISTS" }
```
— `409`, mapped from Prisma's `P2002` on the `username` unique constraint.

Changing `username` to the value it **already has** succeeds as a normal
`200`, not a `409` — Postgres's unique constraint doesn't conflict with a
value already held by that same row, so no special-case code is needed here
at all; it's just what the constraint does.

## Safe serialization

Two views, produced by two explicit allow-list functions in
`server/src/utils/user.js` (the private one already existed from Phase 4;
`toPublicUser` is new, added alongside it rather than as a parameter on the
existing function):

```js
export const PRIVATE_USER_SELECT = { id, name, username, email, bio, avatarUrl, createdAt, updatedAt }
export const PUBLIC_USER_SELECT  = { id, name, username, bio, avatarUrl, createdAt }

export function toSafeUser(user) { /* private view — used by register, login, /me */ }
export function toPublicUser(user) { /* public view — used by public profile, search */ }
```

Neither ever spreads a raw Prisma row, and `passwordHash` is not part of
either `select` shape — the boundary is enforced at the query itself, the
same discipline established in Phase 4. `auth.service.js`'s own select
constant now imports `PRIVATE_USER_SELECT` from this shared location
instead of redefining an identical object, so the two modules can't quietly
drift into two different ideas of "the private view."

## Search

`GET /api/users/search?q=&page=&limit=` — no authentication required (this
will be reused later for adding project members and task assignees, which
also shouldn't require being logged in to look someone up... though in
practice those flows will sit behind their own authenticated routes; the
search endpoint itself has no reason to require auth on its own).

### Validation

| Param | Rule |
|---|---|
| `q` | **required**, non-empty after trim, ≤100 characters — missing/empty is a `400`, never treated as "match everyone" |
| `page` | optional, positive integer, default `1` |
| `limit` | optional, positive integer, default `10`, max `50` |

`page=0`, `page=-1`, `page=abc`, `limit=0`, `limit=-5`, `limit=abc`, and
`limit=51` are all `400`.

### Matching and ordering

```js
where: {
  OR: [
    { username: { contains: q, mode: 'insensitive' } },
    { name: { contains: q, mode: 'insensitive' } },
  ],
}
```

Case-insensitive via Postgres's `ILIKE` (Prisma's `mode: 'insensitive'`),
not an in-memory filter. Results are ordered by `username` ascending —
deterministic, so the same query always returns results in the same order
regardless of insertion order.

### Pagination

Done in the database via `skip`/`take` (`skip = (page - 1) * limit`), never
by fetching everything and slicing in JavaScript. `count()` and
`findMany()` run concurrently (`Promise.all`), not sequentially.

```json
{
  "success": true,
  "data": {
    "users": [
      { "id": "...", "name": "Priya Sharma", "username": "priya_sharma", "bio": "...", "avatarUrl": "...", "createdAt": "..." }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 12, "totalPages": 2 }
  }
}
```

Verified during testing: `page=1&limit=5` and `page=2&limit=5` against the
same 14-result query returned two disjoint sets of usernames (zero
overlap), with matching `total`/`totalPages` on both pages.

## Authorization

Phase 5 introduces no new authorization system — `requireAuth` (Phase 4)
remains the only gate, and it answers "is this a valid, current user,"
never "is this user allowed to act on someone else's data." That's
sufficient here because every write in this phase is scoped to
`req.user.id` by construction — there is no route, parameter, or field that
lets a request name a different user to modify. A real per-resource
authorization layer (project roles) is planned for Phase 6+, once there's a
resource that isn't already implicitly "yours."

## Security considerations

- **`passwordHash`** never appears in the public profile, `/me`, the PATCH
  response, or search results — confirmed directly during testing for all
  four.
- **Email** is never in the public profile or search results; it appears
  only in the authenticated `/me` view, which is exactly and only what the
  caller is allowed to see about themselves.
- **No client-supplied identity.** `PATCH /api/users/me` and
  `GET /api/users/me` both derive their target exclusively from the JWT via
  `req.user.id`. A field like `id` in the PATCH body is rejected outright
  (it isn't in the editable whitelist), not read and used.
- **No unbounded queries.** Search requires `q`; there is no endpoint that
  returns "all users" without a search term.
- **Logging:** the request logger records method/path/status/duration only.
  Nothing in the profile module logs a password, a password hash, a JWT, a
  connection string, or a request body.

### What was verified

Every scenario below was exercised against a running server backed by the
real PostgreSQL container:

- Public profile: existing seeded username → `200` safe fields only, no
  `email`/`passwordHash`; nonexistent username → `404`; mixed-case URL
  segment (`/Alice_Johnson`) resolves to the same profile as the canonical
  lowercase form.
- `/me`: valid token → `200` correct user, no `passwordHash`; no token →
  `401`; malformed token → `401`.
- `PATCH /me`: `name`, `bio`, `avatarUrl`, and `username` updated
  individually (each `200`, each verified in the next response); multiple
  fields in one request; empty body → `400`; `email`/`password`/`id`/
  `passwordHash`/`createdAt` each individually → `400`; invalid username
  shape (`UserName`) → `400`; duplicate username (an existing seeded user's
  name) → `409`; updating username to its own current value → `200`
  no-op; 501-character bio → `400`; `javascript:alert(1)` and
  `data:text/html,...` avatar URLs → `400`; clearing `bio`/`avatarUrl` with
  `""` → stored as `null`; unauthenticated PATCH → `401`.
- Search: `q=ali` matched both a username-substring hit and a
  name-substring hit; `q=a` returned 14 seeded results across 2 pages at
  `limit=5` with zero duplicate usernames between pages and correct
  `totalPages`; `limit=51` → `400`; `limit=abc` → `400`; `page=0` → `400`;
  `page=-1` → `400`; `q=` (empty) → `400`; `q` omitted entirely → `400`.
- Route order: `GET /api/users/search?q=a` reached the search handler (not
  a 404 for a "user named search"); `GET /api/users/me` with no token
  returned `401` (proving it reached `requireAuth`, not a username lookup
  that would 404 instead).
- Full regression: Phase 4 (register, login — valid and invalid, `/auth/me`
  — valid and invalid token) and Phase 3 (health, health/db, 404, malformed
  JSON, oversized body, CORS) all unaffected by this phase's changes.
- Server log inspected directly: no password, password hash, JWT, or
  `DATABASE_URL`/`JWT_SECRET` value appeared anywhere in it (field *names*
  like `"password"` show up only inside validation-rejection messages
  naming which field was disallowed — never a value).
