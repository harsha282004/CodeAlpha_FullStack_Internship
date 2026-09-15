# TaskFlow

CodeAlpha Full Stack Development Internship — Task 3

A collaborative project management tool — projects, members, boards, tasks,
assignments, and comments — built with React, Express, and PostgreSQL.

## Status

**Current phase: Phase 8 complete (task cards).** Architecture is
documented, the monorepo scaffolding (client + server) runs, the full Prisma
schema + seed data are in place, the Express API has its production-ready
foundation (centralized error handling, restricted CORS, security headers,
request-size limits, graceful shutdown), real registration/login/JWT
authentication runs against PostgreSQL, authenticated users can view/edit
their profile and look up or search for other users, users can create
projects and manage OWNER/ADMIN/MEMBER membership with every write
authorized against the caller's actual role in PostgreSQL, each project
organizes its work into ordered boards, and each board can now hold task
cards — title, description, priority, due date, and position, ordered and
filtered strictly within their board.

No other application features are implemented yet: task assignment (Phase
9), task comments (Phase 10), notifications (Phase 11), Socket.IO/real-time
(Phase 12), and the real dashboard/Kanban UI are all planned for later
phases. The homepage still only confirms the frontend can reach the API and
the database — there is no login/register/profile/project/board/task UI
yet, since the frontend for any of this is a later phase. `/api` currently
exposes `health`, `auth`, `users`, and `projects` (including nested boards
and, within those, nested tasks) only.

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

Everything else (`/api/comments`, `/api/notifications`) is deliberately not
mounted yet — those are later phases. `/api/auth`, `/api/users`,
`/api/projects`, the nested `/api/projects/:id/boards`, and the
further-nested `/api/projects/:id/boards/:boardId/tasks` are all now live —
see [Authentication (Phase 4)](#authentication-phase-4),
[User profiles (Phase 5)](#user-profiles-phase-5),
[Projects & membership (Phase 6)](#projects--membership-phase-6),
[Project boards (Phase 7)](#project-boards-phase-7), and
[Task cards (Phase 8)](#task-cards-phase-8) below, plus
[docs/AUTHENTICATION.md](./docs/AUTHENTICATION.md),
[docs/USER_PROFILES.md](./docs/USER_PROFILES.md),
[docs/PROJECTS.md](./docs/PROJECTS.md),
[docs/BOARDS.md](./docs/BOARDS.md), and
[docs/TASKS.md](./docs/TASKS.md) for the full detail.

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

## User profiles (Phase 5)

Public profile lookup, the authenticated user's own profile (view + edit),
and user search — all backed by the same `User` model, no new tables. Full
detail lives in [docs/USER_PROFILES.md](./docs/USER_PROFILES.md); this is
the short version.

**Routes:**

| Method | Path | Auth required | Behavior |
|---|---|---|---|
| `GET` | `/api/users/search?q=&page=&limit=` | no | Case-insensitive username/name search. `200`, or `400` if `q` is missing/empty or `page`/`limit` are invalid |
| `GET` | `/api/users/me` | **yes** | The authenticated user's own profile (includes `email`) |
| `PATCH` | `/api/users/me` | **yes** | Partial update to `name`/`username`/`bio`/`avatarUrl` only |
| `GET` | `/api/users/:username` | no | Anyone's public profile (no `email`, no `updatedAt`). `404` if no such user |

`/search` and `/me` are registered **before** `/:username` in
`profile.routes.js` — otherwise Express would treat a request for
`/api/users/search` or `/api/users/me` as a lookup for a user literally
named `search` or `me`.

**Two response shapes, not one:** a public profile
(`id`, `name`, `username`, `bio`, `avatarUrl`, `createdAt`) never includes
`email` or `passwordHash`; the private `/me` view additionally includes
`email` and `updatedAt` — still never `passwordHash`. Both are produced by
the same allow-list serializers used since Phase 4
(`server/src/utils/user.js`), extended with a second `toPublicUser()`
function rather than a duplicate, possibly-drifting definition.

**`PATCH /api/users/me` only ever touches the caller's own row** — the
target is always `req.user.id` from the verified JWT, never a client-supplied
id. There is no `PATCH /api/users/:id` in this phase. Only `name`,
`username`, `bio`, and `avatarUrl` are editable; supplying `email`,
`password`, `id`, `createdAt`, or anything else is a `400`, not a silently
ignored field. An empty body (`{}`) is also a `400` — there's nothing to
update. Sending `bio: ""` or `avatarUrl: ""` explicitly *clears* that field
(stored as `null`) rather than being rejected.

**Username uniqueness:** changing `username` to one already taken by
someone else is a `409`; changing it to the value it already has succeeds
as a no-op (Postgres's own unique constraint doesn't conflict with a value
already held by that same row).

**Search** requires a non-empty `q` (`400` otherwise — an unrestricted "list
everyone" isn't a supported query), matches `username` OR `name`
case-insensitively via Postgres `ILIKE`, and paginates in the database
(`skip`/`take`), never in application code. `limit` defaults to 10, capped
at 50; `page` defaults to 1. Both must be positive integers or the request
is a `400`.

## Projects & membership (Phase 6)

Project CRUD, OWNER/ADMIN/MEMBER membership, and the authorization layer
every later resource (boards, tasks, comments, notifications) will build on
top of. Full detail — including every authorization rule and the complete
test matrix — lives in [docs/PROJECTS.md](./docs/PROJECTS.md); this is the
short version.

**Routes** (all under `/api/projects`, all require `Authorization: Bearer <token>`):

| Method | Path | Minimum role | Behavior |
|---|---|---|---|
| `POST` | `/` | any authenticated user | Creates a project; caller becomes `OWNER` |
| `GET` | `/` | — | Lists only projects the caller belongs to, paginated |
| `GET` | `/:projectId` | member | Project detail, including the caller's role |
| `PATCH` | `/:projectId` | OWNER or ADMIN | Partial update to `name`/`description` |
| `DELETE` | `/:projectId` | OWNER | Deletes the project and everything under it |
| `POST` | `/:projectId/members` | OWNER or ADMIN | Adds an existing user (default role `MEMBER`) |
| `GET` | `/:projectId/members` | member | Lists members, safe fields only |
| `DELETE` | `/:projectId/members/:userId` | OWNER or ADMIN | Removes a member — never the owner |
| `PATCH` | `/:projectId/members/:userId` | **OWNER only** | Changes a member's role between `ADMIN`/`MEMBER` — never the owner's |

**A non-member gets a `403`, not a `404`, for an existing project they
don't belong to** — but a project that genuinely doesn't exist (or a
malformed id) is still a clean `404`. The two are deliberately
distinguishable and both deliberately reveal nothing else.

**No role is ever trusted from the request.** Every project route reads the
caller's role fresh from `ProjectMember` in PostgreSQL
(`requireProjectMember`/`requireProjectRole` — see
[docs/PROJECTS.md](./docs/PROJECTS.md#authorization-design)), never from a
JWT claim, a body field, or a query parameter. `role: "OWNER"` in a
membership request body is rejected by validation before it ever reaches
that check — there is exactly one OWNER per project (whoever created it),
and neither adding a member nor changing a role can ever produce a second
one or touch the first.

**The owner can't be removed or reassigned through the membership
endpoints** — by an admin, or even by the owner themself. Leaving
ownership behind is `DELETE /api/projects/:projectId`, not member removal.

**Deleting a project cascades entirely** (memberships, boards, tasks —
whichever of those exist by the time later phases add them) via the
`onDelete: Cascade` relations already declared in Phase 2's schema — one
`DELETE`, no orphaned rows, verified directly against the database during
testing.

## Project boards (Phase 7)

Every project can now be organized into ordered boards — the columns
(e.g. "To Do" / "In Progress" / "Done") task cards will live in once
Phase 8 adds tasks. **No board contains anything yet; this phase is the
board structure itself.** Full detail lives in
[docs/BOARDS.md](./docs/BOARDS.md); this is the short version.

**Routes** (all under `/api/projects/:projectId/boards`, all require
`Authorization: Bearer <token>` and project membership):

| Method | Path | Minimum role | Behavior |
|---|---|---|---|
| `POST` | `/` | any member | Creates a board; `position` auto-assigned if omitted |
| `GET` | `/` | any member | Lists this project's boards, ordered by `position` |
| `GET` | `/:boardId` | any member | Board detail |
| `PATCH` | `/:boardId` | OWNER or ADMIN | Rename and/or reorder (`name`/`position`) |
| `DELETE` | `/:boardId` | OWNER or ADMIN | Deletes the board |

**No schema change** — the Phase 2 `Board` model already had every field
this phase needed (`id`, `projectId`, `name`, `position`, `createdAt`,
`updatedAt`).

**A board never leaks across projects.** Every read and write checks both
that the board exists *and* that its `projectId` matches the `:projectId`
in the URL — a board from Project A requested through Project B's URL
returns the exact same `404` a nonexistent board would, never a `403` or
any other hint that it belongs elsewhere. Verified directly during testing
with two independently owned projects.

**Position is automatic by default.** `POST` without a `position` field
assigns the next one after the project's current highest (or `0` for the
first board) — the frontend never has to calculate it. Supplying a
`position` explicitly is allowed (a non-negative integer, `400` otherwise)
but Phase 7 does no collision handling or renumbering — true drag-and-drop
reordering is a later refinement.

**Any project member can create/view boards; only OWNER or ADMIN can
rename, reorder, or delete one** — the same `requireProjectRole`
middleware from Phase 6, reused rather than reimplemented.

## Task cards (Phase 8)

Boards can now hold task cards — the actual units of work. Full detail
lives in [docs/TASKS.md](./docs/TASKS.md); this is the short version.

**Routes** (all under `/api/projects/:projectId/boards/:boardId/tasks`,
all require `Authorization: Bearer <token>` and project membership, and
verify the *entire* project → board → task hierarchy on every request):

| Method | Path | Minimum role | Behavior |
|---|---|---|---|
| `POST` | `/` | any member | Creates a task; `position` auto-assigned if omitted |
| `GET` | `/?page=&limit=` | any member | Lists this board's tasks, ordered and paginated |
| `GET` | `/:taskId` | any member | Task detail |
| `PATCH` | `/:taskId` | any member | Updates `title`/`description`/`priority`/`position`/`dueDate` |
| `DELETE` | `/:taskId` | OWNER or ADMIN | Deletes the task |

**No schema change** — the Phase 2 `Task` model already had every field
this phase needed. **One deliberate design decision worth calling out:**
the schema has no `status` field or enum — a task's workflow stage is
represented by *which board it's on* (this project's boards are its
"To Do"/"In Progress"/"Done", and they're free-text per-project data, not a
fixed enum). Submitting `status` in a request body gets a `400` explaining
this, rather than a generic "unsupported field."

**Priority** uses the existing `TaskPriority` enum unchanged: `LOW`,
`MEDIUM`, `HIGH`, `URGENT` (default `MEDIUM`).

**A task is only ever reachable through its true project *and* board.**
Every task read/write checks the full hierarchy — a task from Board A
requested through Board B's URL (even within the same project), or through
an entirely different project, returns the identical `404 TASK_NOT_FOUND`
a nonexistent task would. Verified directly during testing with two boards
in one project and a second, independently owned project.

**Any project member can create, view, and update a task's content/
priority/position/due date — deletion is OWNER/ADMIN only.** Task
*assignment* (who a task is for) is Phase 9 and isn't implemented yet;
Phase 8 only establishes the card itself.

## Current phase

Phase 0 (architecture/planning), Phase 1 (scaffolding), Phase 2 (database
layer), Phase 3 (backend foundation), Phase 4 (authentication), Phase 5
(user profiles), Phase 6 (projects & membership), Phase 7 (project
boards), and Phase 8 (task cards) are complete. Task assignment (Phase 9),
task comments (Phase 10), notifications (Phase 11), Socket.IO real-time
updates (Phase 12), and the full frontend UI are planned for subsequent
phases.

## Planned features

- Task assignment (who a task is for)
- Comments on tasks
- Project activity timeline
- Notifications
- Real-time updates via Socket.IO
