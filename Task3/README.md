# TaskFlow

CodeAlpha Full Stack Development Internship — Task 3

A collaborative project management tool — projects, members, boards, tasks,
assignments, and comments — built with React, Express, and PostgreSQL.

## Status

**Current phase: Phase 4 complete (authentication).** Architecture is
documented, the monorepo scaffolding (client + server) runs, the full Prisma
schema + seed data are in place, the Express API has its production-ready
foundation (centralized error handling, restricted CORS, security headers,
request-size limits, graceful shutdown), and real registration/login/JWT
authentication now runs against PostgreSQL.

No other application features are implemented yet: projects, boards, tasks,
comments, notifications, and the real dashboard/Kanban UI are all planned
for later phases. The homepage still only confirms the frontend can reach
the API and the database — there is no login/register UI yet, since
frontend authentication is a later phase. `/api` currently exposes `health`
and `auth` only.

## Stack

- **Frontend:** React, TypeScript, TanStack Start, TanStack Router, Vite, Tailwind CSS
- **Backend:** Node.js, Express.js, REST API
- **Database:** PostgreSQL with Prisma ORM
- **Auth foundation (not yet wired up):** JWT, bcryptjs
- **Real-time (planned, bonus):** Socket.IO

## Planned architecture

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the full system
design (including diagrams for the request flow, auth flow, project/task
relationships, and the planned Socket.IO architecture) and
[docs/DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md) for a model-by-model
breakdown of the database.

## Project structure

```
Task3/
├── client/          # TanStack Start + React + TypeScript frontend
├── server/          # Express.js backend + Prisma
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   └── src/
├── docs/
│   ├── ARCHITECTURE.md
│   └── DATABASE_SCHEMA.md
├── docker-compose.yml
├── package.json
├── .env.example
└── .gitignore
```

## Local setup

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Start PostgreSQL (Docker)

```bash
docker compose up -d
```

This starts a dedicated `task3-postgres` container bound to
`127.0.0.1:5434` (chosen so it never collides with Task1's or Task2's local
Postgres instances), with database `taskflow` and user `taskflow`.

### 3. Environment variables

Copy the example env file and adjust as needed:

```bash
cp .env.example server/.env
```

| Variable | Used by | Purpose |
|---|---|---|
| `NODE_ENV` | server | `development` (default) or `production` — gates request logging and required-variable validation |
| `PORT` | server | Port the Express API listens on (default `5002`) |
| `DATABASE_URL` | server | Postgres connection string (must match `docker-compose.yml`) |
| `JWT_SECRET` | server | Signing secret for issued JWTs — required in production; falls back to failing cleanly (500) on first auth request if unset in development |
| `JWT_EXPIRES_IN` | server | How long an issued JWT stays valid (default `1d`) |
| `CLIENT_URL` | server | The only origin the API's CORS policy allows |
| `VITE_API_URL` | client | Base URL the frontend calls (`http://localhost:5002/api`) |

`.env.example` contains placeholders only — never commit real secrets.

### 4. Database setup

```bash
npm run db:generate   # generate the Prisma client
npm run db:migrate    # create tables from the schema
npm run db:seed       # populate development seed data
```

### 5. Run the app

```bash
npm run dev            # frontend + backend together
# or, in separate terminals:
npm run dev:server
npm run dev:client
```

- Frontend: http://localhost:5173
- Backend health: http://localhost:5002/api/health
- Backend + DB health: http://localhost:5002/api/health/db

## Seed data (development only)

Running `npm run db:seed` populates:

- 15 users
- 4 projects, each with several members and roles (OWNER / ADMIN / MEMBER)
- 4 boards per project (To Do, In Progress, Review, Done)
- 40 tasks distributed across boards, with priorities and due dates
- Task assignments (1–2 assignees per task)
- 120 comments across tasks
- Notifications (assignment, comment, and membership events)
- Activity/timeline entries for every event above

**All seeded accounts share the same development-only password:**

```
Passw0rd!
```

This is a local-development credential only — never use it, or this seed
script, against anything other than your local database.

The seed script is idempotent: it upserts by deterministic id, so running
`npm run db:seed` multiple times never creates duplicate rows.

## Backend foundation (Phase 3)

The API base URL is `http://localhost:5002/api`. Every response — success or
error — is JSON with a `success` boolean:

```json
{ "success": true, "message": "TaskFlow API is running" }
{ "success": false, "message": "Route not found", "code": "NOT_FOUND" }
```

**Routes currently available:**

| Method | Path | Behavior |
|---|---|---|
| `GET` | `/api/health` | 200 if the HTTP server is up — independent of the database |
| `GET` | `/api/health/db` | 200 if Prisma can reach PostgreSQL (`SELECT 1`); 503 if not |
| any | anything else under `/api` | 404 JSON (`code: "NOT_FOUND"`), never an HTML error page |

Everything else (`/api/users`, `/api/projects`, `/api/boards`, `/api/tasks`,
`/api/comments`, `/api/notifications`) is deliberately not mounted yet —
those are later phases. `/api/auth` is now live — see
[Authentication (Phase 4)](#authentication-phase-4) below and
[docs/AUTHENTICATION.md](./docs/AUTHENTICATION.md) for the full detail.

**Middleware order:** `helmet` → CORS → request logger (dev only) →
`express.json` (100kb limit) → `/api` router → 404 handler → centralized
error handler.

**Error handling:** a small `AppError` class (`server/src/utils/AppError.js`)
carries `statusCode`/`message`/`code` for deliberate, expected errors (a
service throwing "this dependency is down", a not-found record, etc.). The
centralized handler in `server/src/middleware/errorHandler.js` also
recognizes malformed JSON (→ 400), oversized bodies (→ 413), and known
Prisma errors (unique-constraint conflicts → 409, missing records → 404) —
everything else is treated as an unexpected bug: logged in full server-side,
but the client only ever gets a generic `"Something went wrong"` (no stack
trace, no internals, in any environment).

**CORS:** restricted to the single origin in `CLIENT_URL` — never `*`. Phase
4 authentication uses a bearer JWT in the `Authorization` header rather than
cookies, so no request ever needs credentials — credentialed CORS stays off.
`helmet`'s default
cross-origin resource policy is relaxed to `cross-origin`, since the
frontend and API are expected to run on different ports/origins in this
project by design (Vite dev server vs. Express) — without that adjustment,
browsers would block the frontend's own `fetch()` calls despite CORS
allowing them.

**Graceful shutdown:** `SIGINT`/`SIGTERM` stop new connections, let in-flight
requests finish, disconnect Prisma, then exit — guarded so a second signal
mid-shutdown can't run the sequence twice.

## Authentication (Phase 4)

Real registration, login, and JWT-based authentication against PostgreSQL —
no mock users, no frontend-only auth. Full detail (flows, security
reasoning, request/response examples) lives in
[docs/AUTHENTICATION.md](./docs/AUTHENTICATION.md); this is the short
version.

**Routes:**

| Method | Path | Auth required | Behavior |
|---|---|---|---|
| `POST` | `/api/auth/register` | no | Creates a user, returns the safe user + a JWT. `201`, or `409` if the email/username is already taken |
| `POST` | `/api/auth/login` | no | Verifies email/password, returns the safe user + a JWT. `200`, or `401` for any invalid credential |
| `GET` | `/api/auth/me` | **yes** | Returns the authenticated user. `200`, or `401` if the token is missing/invalid/expired |

**Authorization header:** `Authorization: Bearer <token>` — anything else
(missing, wrong scheme, empty, malformed, expired, tampered, wrong
signature) gets the same generic `401 {"success":false,"message":"Authentication required","code":"AUTHENTICATION_REQUIRED"}`,
so a caller can't use the response to fingerprint *why* it failed.

**Passwords:** hashed with bcrypt (cost 12) via `bcryptjs`; `passwordHash` is
never selected out of the database for anything except the login check
itself, and is never present in any API response.

**Validation (`POST /api/auth/register`):** `name` (required, ≤100 chars),
`username` (required, `^[a-z0-9_]{3,30}$`, checked before any
case-normalization so mixed-case input like `UserName` is rejected rather
than silently lowercased), `email` (required, normalized to lowercase,
basic format check, ≤254 chars), `password` (required, 8–72 characters —
72 is bcrypt's own input limit, enforced here so an over-length password is
rejected with `400` instead of silently truncated).

**JWT payload:** `{ sub: "<user id>" }` plus the standard `iat`/`exp` —
nothing else. Verified with the decoded output during testing; see
[docs/AUTHENTICATION.md](./docs/AUTHENTICATION.md#jwt-design).

**Login errors are intentionally generic:** a nonexistent email and a wrong
password both return the exact same `401 "Invalid email or password"` —
distinguishing them would let a caller enumerate which emails are
registered. A login attempt against a nonexistent email still runs a real
bcrypt comparison (against a fixed dummy hash) so its response time doesn't
give that away either.

No frontend login/register UI exists yet — that's a later phase. The
backend works completely independently through the API, verified with
`curl` throughout development.

## Current phase

Phase 0 (architecture/planning), Phase 1 (scaffolding), Phase 2 (database
layer), Phase 3 (backend foundation), and Phase 4 (authentication) are
complete. User profile editing, the projects/boards/tasks REST API,
comments, notifications, Socket.IO real-time updates, and the full frontend
UI (including a login/register experience) are planned for subsequent
phases.

## Planned features

- Profile management, project creation, invite members, assign roles
- Boards and drag-and-drop task cards
- Task assignment, priorities, due dates, task detail view
- Comments on tasks
- Project activity timeline
- Notifications
- Real-time updates via Socket.IO
