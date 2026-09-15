# TaskFlow — Authentication (Phase 4)

This document covers the authentication module in detail: the registration
and login flows, JWT design, middleware behavior, password security, API
examples, and the security reasoning behind each decision. For where this
fits in the overall system, see [ARCHITECTURE.md](./ARCHITECTURE.md#9-authentication-architecture).

Scope: this phase is authentication only. There is no authorization
(project roles), no profile editing, and no frontend login/register UI —
those are later phases. Everything below works independently through the
REST API.

## File layout

```
server/src/
├── controllers/auth.controller.js   — thin: validate → call service → respond
├── middleware/auth.middleware.js    — requireAuth: verifies the JWT
├── routes/auth.routes.js            — POST /register, POST /login, GET /me
├── services/auth.service.js         — all database access + business logic
├── utils/
│   ├── jwt.js                       — sign/verify
│   ├── password.js                  — hash/verify (bcrypt)
│   └── user.js                      — toSafeUser() serializer
└── validators/auth.validator.js     — input validation for register/login
```

Same layered flow as every other route in this project:

```
Route → Controller → Service → Prisma → PostgreSQL
```

## Registration flow

`POST /api/auth/register`

```json
{
  "name": "Ada Lovelace",
  "username": "ada_lovelace",
  "email": "ada@example.com",
  "password": "a-strong-password"
}
```

1. **Validate** (`auth.validator.js`) — see [Validation rules](#validation-rules)
   below. Any failure throws `AppError(message, 400, 'VALIDATION_ERROR')`.
2. **Check for an existing account** — `prisma.user.findFirst({ where: { OR: [{email}, {username}] } })`.
   If found, `409 USER_ALREADY_EXISTS`.
3. **Hash the password** — `bcrypt.hash(password, 12)`.
4. **Create the user** — `prisma.user.create(...)`, selecting only the safe
   fields (see [Safe user serialization](#safe-user-serialization)).
   If a concurrent request won the race between step 2 and this insert,
   Prisma's own unique constraint throws `P2002`, caught and converted to
   the same `409 USER_ALREADY_EXISTS` — the pre-check is a fast path, not
   the actual guarantee.
5. **Sign a JWT** for the new user.
6. **Respond `201`** with the safe user and the token.

Success response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "56895c35-d5ba-415b-b612-b3d6318bebc2",
      "name": "Ada Lovelace",
      "username": "ada_lovelace",
      "email": "ada@example.com",
      "bio": null,
      "avatarUrl": null,
      "createdAt": "2026-09-15T17:21:58.515Z",
      "updatedAt": "2026-09-15T17:21:58.515Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

Duplicate account:

```json
{ "success": false, "message": "An account with that email or username already exists", "code": "USER_ALREADY_EXISTS" }
```
— `409`, and deliberately the same message whether the conflict was the
email or the username, so the response doesn't hand back more detail about
the existing account than necessary.

### Validation rules

| Field | Rule |
|---|---|
| `name` | required, non-empty string, trimmed, ≤100 characters |
| `username` | required, trimmed, must match `^[a-z0-9_]{3,30}$` **before** lowercasing (see below) |
| `email` | required, trimmed, lowercased, ≤254 characters, basic `local@domain.tld` shape |
| `password` | required, 8–72 characters (not silently truncated) |

**Why username case is checked before lowercasing, not after:** normalizing
first (`"UserName"` → `"username"`) would make it pass validation as a
side effect, quietly rewriting what the user typed into something they
didn't choose. Validating the original casing instead means `UserName`,
`hello-world`, `hello space`, and `ab` are all rejected outright with `400`.

**Why 72 characters, checked before hashing:** bcrypt itself silently
truncates any input past 72 bytes. Enforcing the limit in the validator
means an over-length password gets a clear `400` instead of being quietly
hashed as a weaker, truncated password the user never agreed to.

All validation failures return the same shape:

```json
{ "success": false, "message": "<specific reason>", "code": "VALIDATION_ERROR" }
```

## Login flow

`POST /api/auth/login`

```json
{ "email": "ada@example.com", "password": "a-strong-password" }
```

1. **Validate** — email and password are both required, non-empty strings;
   email is trimmed and lowercased.
2. **Look up the user by email**, selecting `passwordHash` this one time
   (see [Safe user serialization](#safe-user-serialization)).
3. **If no such user:** run `bcrypt.compare` against a fixed dummy hash
   anyway (see [Timing safety](#timing-safety)), then fail.
4. **If found:** `bcrypt.compare(password, user.passwordHash)`.
5. **Either failure → the exact same response:** `401 "Invalid email or password"`,
   `code: "INVALID_CREDENTIALS"`. There is no separate "no such account"
   message.
6. **On success:** sign a JWT, respond `200` with the safe user and token —
   identical shape to registration's success response.

### Timing safety

A login service that only calls `bcrypt.compare` when the account exists
leaks information through response time alone: a nonexistent email returns
almost instantly, while a wrong password for a real account takes as long
as a bcrypt comparison (deliberately slow, that's the point of bcrypt). An
attacker measuring response times could use that gap to enumerate which
emails are registered, even though the response body never says so.

The fix here is a dummy hash, computed once per process (not per request):

```js
const dummyHashPromise = hashPassword('not-a-real-account-timing-safety-only')
```

When the looked-up user doesn't exist, the login flow still awaits a real
`bcrypt.compare` against this value before responding. It is never a real
account's password and is never stored anywhere — its only purpose is to
make "email doesn't exist" cost roughly the same as "email exists, password
wrong."

## JWT design

**Payload — deliberately minimal:**

```json
{
  "sub": "56895c35-d5ba-415b-b612-b3d6318bebc2",
  "iat": 1789492918,
  "exp": 1789579318
}
```

`sub` (the user's id) plus the standard `iat`/`exp` that `jsonwebtoken` adds
automatically — nothing else. No email, name, or role is embedded. Reasons:

- A token can outlive the data it might have captured (a name change, an
  email change) — anything beyond identity would go stale.
- Anyone who can decode a JWT (the payload is base64, not encrypted) can
  read every claim in it. Keeping it to an opaque id means a leaked/logged
  token reveals nothing about the account beyond "some user."
- Whenever a request actually needs the user's current data, it's looked up
  fresh from `req.user.id` — one extra query is a small cost for always
  being correct.

**Signing/verification** (`server/src/utils/jwt.js`):

- `jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })`
- `jwt.verify(token, JWT_SECRET)` — throws for anything wrong (expired,
  malformed, tampered, wrong signature); the middleware turns every one of
  those into the same generic `401`.
- If `JWT_SECRET` isn't set, signing/verifying fails immediately with a
  clean `500 AUTH_NOT_CONFIGURED` rather than letting `jsonwebtoken` throw
  its own raw "secretOrPrivateKey must have a value" error.

**Expiration** — governed entirely by `JWT_EXPIRES_IN` (default `1d`).
Tokens are never effectively permanent; `requireAuth` rejects an expired
token exactly like every other invalid one.

## Authentication middleware

`requireAuth` (`server/src/middleware/auth.middleware.js`) protects
`GET /api/auth/me` and will protect every authenticated route added in
later phases.

```
Authorization header
        ↓
requireAuth
  1. read the header, require exactly "Bearer <token>"
  2. reject empty/missing/wrong-scheme headers
  3. jwt.verify(token) — reject expired/malformed/tampered/wrong-signature
  4. require payload.sub to be a non-empty string
  5. req.user = { id: payload.sub }
        ↓
next() → controller
```

It **never queries the database.** A valid JWT signature is already
sufficient proof of who is calling — that's the whole point of a signed
token. Whether that user is *allowed* to do something (authorization, e.g.
"is this user a member of this project") is a separate, later concern that
will query the database itself once there's a resource to protect.

Every rejection — missing header, `Authorization: Basic ...`, `Authorization: Bearer`
with nothing after it, `Authorization: Bearer <malformed>`, an expired
token, a tampered token, a token signed with the wrong secret — produces
the identical response:

```json
{ "success": false, "message": "Authentication required", "code": "AUTHENTICATION_REQUIRED" }
```
— `401`, every time. The client is never told *which* of these happened;
that distinction has no legitimate use for a caller and only helps someone
probing for weaknesses.

## Current-user endpoint

`GET /api/auth/me` (requires `Authorization: Bearer <token>`)

```
Authorization header → requireAuth → req.user.id → auth controller
  → auth service → Prisma User query (safe select) → safe user response
```

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

If the token is valid but the account it points to no longer exists (e.g.
deleted after the token was issued), the response is still a generic
`401 AUTHENTICATION_REQUIRED` — from the caller's side, "your token doesn't
correspond to anyone" and "your token is invalid" look the same.

## Safe user serialization

Two mechanisms work together so `passwordHash` structurally cannot reach a
response:

1. **Query-level exclusion.** `auth.service.js` declares two separate
   Prisma `select` objects — one includes `passwordHash` (used only for the
   login lookup), the other never selects it at all (used by registration's
   insert and by `/me`). The boundary is enforced at the query, not
   remembered by a serializer downstream.
2. **`toSafeUser()`** (`server/src/utils/user.js`) — an explicit field
   allow-list, never a spread of the Prisma row:

   ```js
   export function toSafeUser(user) {
     return {
       id: user.id, name: user.name, username: user.username,
       email: user.email, bio: user.bio ?? null, avatarUrl: user.avatarUrl ?? null,
       createdAt: user.createdAt, updatedAt: user.updatedAt,
     }
   }
   ```

Used identically by registration, login, and `/me` — one function, one
definition of "safe," used everywhere a user is returned.

## API examples

```bash
# Register
curl -X POST http://localhost:5002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada Lovelace","username":"ada_lovelace","email":"ada@example.com","password":"a-strong-password"}'

# Login
curl -X POST http://localhost:5002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@example.com","password":"a-strong-password"}'

# Current user
curl http://localhost:5002/api/auth/me \
  -H "Authorization: Bearer <token from register or login>"
```

## Security considerations

- **Passwords:** bcrypt, cost 12, via `bcryptjs`. Never stored or logged in
  plaintext. Never truncated silently (rejected at 72 chars instead).
- **`passwordHash`:** never in an API response, in any of the three
  endpoints — verified directly during testing (see below).
- **Login errors:** identical status, message, and code regardless of
  whether the email exists — no account enumeration via response content
  or response timing.
- **JWTs:** minimal payload, always expire, signed server-side only,
  verified centrally, every failure mode collapsed into one generic 401.
- **Logging:** the request logger records method/path/status/duration only.
  Nothing in the auth module logs a password, a password hash, a JWT, or
  `JWT_SECRET`/`DATABASE_URL` — confirmed by grepping actual server output
  captured during testing.
- **Duplicate accounts:** a clean `409` with a message that doesn't reveal
  whether it was the email or the username that conflicted.
- **No new dependencies, no schema change:** `bcryptjs` and `jsonwebtoken`
  were already present from Phase 1 scaffolding; the Phase 2 `User` model
  already had every field this phase needed.

### What was verified

Every scenario below was exercised against a running server backed by the
real PostgreSQL container (not mocked):

- Valid registration → `201`, safe user, JWT, no `passwordHash` in the body.
- Duplicate email → `409`; duplicate username → `409`.
- Invalid username shapes: `ab`, `UserName`, `hello-world`, `hello space` → all `400`.
- Invalid email shape → `400`. Short password (7 chars) → `400`. 73-character
  password → `400`. Missing required fields → `400`.
- Correct login → `200`, safe user, JWT. Wrong password → `401` generic.
  Nonexistent email → `401`, identical message/code to the wrong-password case.
- `/me` with a valid token → `200` with the correct user, no `passwordHash`.
- `/me` with: no header, `Authorization: Basic ...`, `Authorization: Bearer`
  (empty), a malformed token, a tampered token (one flipped character), an
  expired token, and a token signed with a different secret — all `401`,
  all the identical generic response, none a `500`.
- Decoded a real issued JWT's payload and confirmed it contains only `sub`,
  `iat`, `exp`.
- Logged in as an existing Phase 2 seed user (`alice_johnson`, password
  `Passw0rd!`, hashed at seed time) through this new endpoint successfully —
  confirms hash compatibility isn't tied to a particular request path.
- Full register → login → `/me` sequence with a fresh account, confirming
  the same user id is returned at every step.
- Phase 3 regression: `/api/health` (200), `/api/health/db` (200), unknown
  route (404), malformed JSON (400), oversized body (413), CORS (allowed
  origin gets the header, arbitrary origin doesn't match it) — all
  unaffected by this phase's changes.
