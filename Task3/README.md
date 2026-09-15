# TaskFlow

CodeAlpha Full Stack Development Internship — Task 3

A collaborative project management tool — projects, members, boards, tasks,
assignments, and comments — built with React, Express, and PostgreSQL.

## Status

**Current phase: Phase 3 complete (backend foundation).** Architecture is
documented, the monorepo scaffolding (client + server) runs, the full Prisma
schema + seed data are in place, and the Express API now has its complete
production-ready foundation: centralized error handling, a consistent JSON
response shape, restricted CORS, security headers, request-size limits,
development logging, and graceful shutdown.

No application features are implemented yet: authentication, projects,
boards, tasks, comments, notifications, and the real dashboard/Kanban UI are
all planned for later phases. The homepage currently only confirms the
frontend can reach the API and the database. `/api` only exposes the two
health endpoints described below.

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
| `JWT_SECRET` | server | Signing secret for JWTs (auth is implemented in a later phase; required in production already, so Phase 4 has nothing left to configure) |
| `JWT_EXPIRES_IN` | server | JWT expiry (default `1d`) |
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

Everything else (`/api/auth`, `/api/users`, `/api/projects`, `/api/boards`,
`/api/tasks`, `/api/comments`, `/api/notifications`) is deliberately not
mounted yet — those are later phases.

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

**CORS:** restricted to the single origin in `CLIENT_URL` — never `*`. No
cookies are sent yet, so credentialed CORS is intentionally left off; that
gets revisited if/when Phase 4 auth needs it. `helmet`'s default
cross-origin resource policy is relaxed to `cross-origin`, since the
frontend and API are expected to run on different ports/origins in this
project by design (Vite dev server vs. Express) — without that adjustment,
browsers would block the frontend's own `fetch()` calls despite CORS
allowing them.

**Graceful shutdown:** `SIGINT`/`SIGTERM` stop new connections, let in-flight
requests finish, disconnect Prisma, then exit — guarded so a second signal
mid-shutdown can't run the sequence twice.

## Current phase

Phase 0 (architecture/planning), Phase 1 (scaffolding), Phase 2 (database
layer), and Phase 3 (backend foundation) are complete. Authentication, the
projects/boards/tasks REST API, comments, notifications, Socket.IO
real-time updates, and the full frontend UI are planned for subsequent
phases.

## Planned features

- Register/login, profile management
- Create projects, invite members, assign roles
- Boards and drag-and-drop task cards
- Task assignment, priorities, due dates, task detail view
- Comments on tasks
- Project activity timeline
- Notifications
- Real-time updates via Socket.IO
