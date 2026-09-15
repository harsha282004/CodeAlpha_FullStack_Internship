# TaskFlow — Task Cards (Phase 8)

This document covers task CRUD: the cards that live on a project's boards.
For where this fits in the overall system, see
[ARCHITECTURE.md](./ARCHITECTURE.md#12-boardtask-relationship). For project
membership/roles and board CRUD, see [PROJECTS.md](./PROJECTS.md) and
[BOARDS.md](./BOARDS.md) — this module reuses that authorization layer
unchanged rather than reimplementing it.

**Scope: the task card itself only.** This phase implements creation,
listing, detail, update, and deletion of tasks — their title, description,
priority, position, and due date. It does **not** implement:

- **Task assignment** (who a task is for) — **Phase 9**
- **Task comments** — **Phase 10**
- **Notifications** — **Phase 11**
- **Socket.IO / real-time updates** — **Phase 12**
- **Frontend UI** of any kind, for any of the above

Nothing in this document should be read as claiming any of those exist yet.

## Task lifecycle / hierarchy

A task belongs to exactly one board; a board belongs to exactly one
project. Every task operation verifies the complete hierarchy:

```
Project (URL :projectId)
    ↓ requireProjectMember — is the caller a member? attaches req.projectMembership
Board (URL :boardId)
    ↓ requireBoardInProject — does this board belong to that project? attaches req.board
Task (URL :taskId, where applicable)
    ↓ getTaskWithinBoard (task.service.js) — does this task belong to that board?
```

A task ID, board ID, or project ID that doesn't fit this chain is never
exposed — see [Isolation](#isolation) below.

## File layout

```
server/src/
├── controllers/task.controller.js    — thin: validate → call service → respond
├── middleware/boardAuth.middleware.js — requireBoardInProject (new this phase)
├── routes/task.routes.js             — mounted from board.routes.js
├── services/task.service.js          — all task database access + business logic
├── validators/task.validator.js
└── utils/task.js                     — toTaskSummary()
```

Same layered flow as every other route in this project:

```
Route → Middleware (auth + project membership + board-in-project) → Controller → Service → Prisma → PostgreSQL
```

## Database

**No schema change.** The Phase 2 `Task` model already had every field
this phase needed:

```prisma
model Task {
  id          String       @id @default(uuid()) @db.Uuid
  projectId   String       @map("project_id") @db.Uuid
  boardId     String       @map("board_id") @db.Uuid
  title       String
  description String?      @db.Text
  priority    TaskPriority @default(MEDIUM)
  position    Int
  dueDate     DateTime?    @map("due_date")
  createdById String       @map("created_by_id") @db.Uuid
  createdAt   DateTime     @default(now()) @map("created_at")
  updatedAt   DateTime     @updatedAt @map("updated_at")
}
```

Confirmed via `prisma migrate status` before and after implementation —
"Database schema is up to date!" both times.

### A deliberate non-change: no `status` field

The schema has no `TaskStatus` enum and no `status` column. This project's
architecture has treated **which board a task is on** as its workflow
stage since Phase 0 (see `ARCHITECTURE.md`'s original "Data flow" example:
"a user moves a task to a different board"). Board names are free-text,
per-project data by design — a project can have "To Do"/"In Progress"/
"Done," or "Backlog"/"This Sprint"/"Blocked"/"Shipped," or anything else —
precisely so it isn't locked into a fixed set of stages.

Adding a separate `TaskStatus` enum alongside that would create two
possibly-contradictory ideas of a task's stage (a task sitting on a custom
"Blocked" board while its `status` field says `DONE`, for instance), with
nothing in the schema to say which one is authoritative. Rather than
introduce that, `task.validator.js` recognizes `status` by name and
explains why it isn't accepted, instead of treating it as a generic
unknown field:

```json
{
  "success": false,
  "message": "task status is represented by which board a task belongs to (this project's boards are its workflow stages), not a separate 'status' field — move the task to a different board instead",
  "code": "VALIDATION_ERROR"
}
```

If a real need for a status independent of board placement shows up later
(e.g. a "blocked" flag orthogonal to which column a task visually sits
in), that's a legitimate, minimal schema addition for whichever future
phase actually needs it — not something Phase 8 should pre-empt without a
concrete requirement driving it.

## Routes

Mounted at `/api/projects/:projectId/boards/:boardId/tasks`
(`server/src/routes/task.routes.js`, a `Router({ mergeParams: true })`
mounted from `board.routes.js` via
`router.use('/:boardId/tasks', requireBoardInProject(), taskRoutes)`).
Every route requires `Authorization: Bearer <token>` and project
membership, plus a board that genuinely belongs to the project; one
additionally requires `OWNER`/`ADMIN`:

| Method | Path | Additional gate | Purpose |
|---|---|---|---|
| `POST` | `/` | — (any member) | Create a task |
| `GET` | `/?page=&limit=` | — (any member) | List this board's tasks, paginated |
| `GET` | `/:taskId` | — (any member) | Task detail |
| `PATCH` | `/:taskId` | — (any member) | Update content/priority/position/due date |
| `DELETE` | `/:taskId` | `OWNER`/`ADMIN` | Delete the task |

## Authorization

Per Phase 8's brief: **any project member may create, list, view, and
update a task** — task content is a shared, collaborative surface, not
something gated behind elevated roles (this is a deliberate difference
from boards, where only `OWNER`/`ADMIN` can restructure the board itself;
tasks are what boards are *for*, and the whole team works on them).
**Only `OWNER`/`ADMIN` may delete a task** — the same asymmetry Phase 6/7
already established for destructive operations.

No task-assignee-specific permission exists yet ("only the assignee or an
admin can update a task" is explicitly out of scope — see Phase 9). No
role is ever trusted from the request; `req.projectMembership.role` always
comes from the `ProjectMember` row looked up fresh from PostgreSQL for
this request, and task creation's `createdById` is always
`req.user.id` from the verified JWT, never a client-supplied value.

## Isolation

**A task is only reachable through its true project *and* board.** Every
read and write checks both:

```js
// task.service.js
async function getTaskWithinBoard(boardId, taskId) {
  if (!UUID_REGEX.test(taskId)) throw taskNotFoundError()

  const task = await prisma.task.findUnique({ where: { id: taskId }, select: TASK_SELECT })
  if (!task || task.boardId !== boardId) throw taskNotFoundError()
  return task
}
```

`getTask`, `updateTask`, and `deleteTask` all call this before doing
anything else. A task requested through a *different board in the same
project*, or through an *entirely different project*, produces the exact
same `404 TASK_NOT_FOUND` a genuinely nonexistent task would — never a
`403`, never any detail suggesting the id was "real" but just misplaced.
This mirrors [BOARDS.md](./BOARDS.md#board-level-isolation)'s reasoning
exactly: a task has no identity worth confirming independently of its
board, so a `404` covers every true fact a caller needs.

The board half of the hierarchy is verified one level up, by
`requireBoardInProject` (`server/src/middleware/boardAuth.middleware.js`),
applied to every task route via the mount point — so `task.service.js`
only needs to confirm the task-to-board link; the board-to-project link is
already guaranteed by the time any task code runs.

## Task fields

| Field | Create | Update | Rule |
|---|---|---|---|
| `title` | required | optional | non-empty after trim, ≤200 characters |
| `description` | optional | optional | trimmed, ≤2000 characters; empty string or explicit `null` clears it |
| `priority` | optional (defaults to `MEDIUM`) | optional | one of `LOW`, `MEDIUM`, `HIGH`, `URGENT` (the existing `TaskPriority` enum, unchanged) |
| `position` | optional (auto-assigned if omitted) | optional | non-negative integer |
| `dueDate` | optional | optional | ISO 8601 date string, or explicit `null` to clear |

Any other field — `id`, `projectId`, `boardId`, `createdById`, `createdAt`,
`updatedAt`, `status` (see above), or anything not in this list — is
rejected with `400`, the same as an empty update body. The parent
project/board always come from the URL, never the request body: accepting
a `boardId` field would let a client try to point a task at a different
board than the one in the URL, which the whitelist makes structurally
impossible.

## Position / ordering

Tasks are ordered within a board by `position` ascending, then `createdAt`
ascending, then `id` ascending — the last two are deterministic
tiebreakers for the (currently unprevented) case of two tasks sharing a
position and/or a creation timestamp.

**Creating a task without a `position` auto-assigns the next one,** scoped
to the board:

```js
async function nextPosition(boardId) {
  const result = await prisma.task.aggregate({ where: { boardId }, _max: { position: true } })
  return (result._max.position ?? -1) + 1
}
```

`MAX(position) + 1` within the board, or `0` for the first task — computed
fresh from the current rows every time, the same approach Phase 7 uses for
boards within a project. The frontend never has to calculate a position
itself. Supplying `position` explicitly is still allowed (validated as a
non-negative integer), but Phase 8 does no drag-and-drop reordering
algorithm or renumbering — a future phase can add that.

## Listing and pagination

`GET /?page=&limit=` queries only `where: { boardId }` — never a global
task table scan filtered afterward. `page` defaults to `1`, `limit`
defaults to `20` (max `50`), matching the convention already established
for project and user-search listings. `count()` and `findMany()` run
concurrently via `Promise.all`.

## Deletion

`DELETE /:taskId` requires `OWNER`/`ADMIN`. Before implementing it, the
existing `Task` relations were inspected in `schema.prisma`:

- `TaskAssignee`, `Comment`, `Notification` — all `onDelete: Cascade` from
  `Task`. Deleting a task would cascade-delete these. Phases 9/10 haven't
  introduced assignee/comment creation yet, so no such row can currently
  reference any task — this is documented so the cascade isn't a surprise
  once those phases exist.
- `Activity.taskId` — `onDelete: SetNull`, not `Cascade`. A project's
  activity timeline entry survives even after the task it references is
  deleted (it just loses the specific task link) — consistent with
  Activity being an audit log, not a live pointer. No `Activity` rows are
  created by anything in this phase either; this is a pre-existing schema
  fact being verified and recorded, not new behavior.

Nothing in Phase 8 creates or touches `TaskAssignee`, `Comment`,
`Notification`, or `Activity` rows — deletion relies entirely on the
schema-level cascade/set-null behavior already declared in Phase 2.

## Validation

`task.validator.js` follows the whitelist discipline established in
Phases 5–7 — see [Task fields](#task-fields) above for the exact rules.
Malformed `:boardId`/`:taskId` path segments are treated as "not found"
(404), not a validation error (400) — consistent with every other
hierarchy check in this project (`requireProjectMember`,
`getBoardWithinProject`).

## Error handling

Follows the existing `AppError`/`errorHandler` conventions unchanged:

| Status | Meaning | Example |
|---|---|---|
| `400` | Invalid input | Empty title, invalid `priority`/`position`/`dueDate`, unsupported field |
| `401` | Not authenticated | No/invalid JWT |
| `403` | Authenticated, not authorized | Non-member; `MEMBER` attempting delete |
| `404` | Not found / wrong parent | Nonexistent project/board/task; task from a different board or project |

No stack traces, no Prisma internals, no database details in any response.

## Security considerations

- **No task is ever reachable through the wrong board or project** —
  verified structurally (one shared check per hierarchy level) and
  directly during testing.
- **No role is ever trusted from the client** — same discipline as
  Phases 6/7, reused rather than reimplemented.
- **`boardId`/`projectId`/`createdById` cannot be supplied in a request
  body** — the parent hierarchy comes from the URL, the creator from the
  verified JWT; neither is ever read from client input.
- **Logging:** the request logger records method/path/status/duration
  only. Nothing in this module logs a password, a JWT, a connection
  string, or a request body.

### What was verified

Every scenario below was exercised against a running server backed by the
real PostgreSQL container, using four accounts (owner, admin, member,
outsider), two boards in one project, and a second independently owned
project with its own board:

- **Authentication:** all five endpoints reject an unauthenticated request
  with `401`.
- **Project/board access:** OWNER, ADMIN, and MEMBER can all
  create/list/view/update tasks; a genuine non-member gets `403` on all
  four; a nonexistent project and a nonexistent board both `404`.
- **Create:** valid (with description/priority) → `201`, default
  `priority: MEDIUM` confirmed when omitted; two sequential creates with
  no `position` supplied assigned `0` and `1` automatically; missing title
  → `400`; empty (whitespace-only) title → `400`; invalid priority
  (`SUPER_URGENT`) → `400`; invalid position (`-1`) → `400`; a `status`
  field → `400` with the explanatory message (not a generic rejection);
  unsupported field (`boardId`) → `400`.
- **List:** board A1's list showed exactly its own 2 tasks in position
  order; board A2's (empty) list never showed A1's tasks.
- **Detail:** correct hierarchy → `200`; **task A1 requested through
  board A2 (same project)** → `404 TASK_NOT_FOUND`; **task A1 requested
  through Project B's board** → `404 TASK_NOT_FOUND`; nonexistent task →
  `404`.
- **Update:** MEMBER updates title+priority → `200`; ADMIN updates
  position → `200`; OWNER updates `dueDate` → `200`; non-member → `403`;
  empty body → `400`; empty title → `400`; invalid priority → `400`;
  invalid (non-integer) position → `400`; unsupported field
  (`createdById`) → `400`; **update of task A1 through board A2** → `404`;
  **update of task A1 through Project B** → `404` (task left untouched in
  both cases).
- **Delete:** MEMBER → `403`; non-member → `403`; **delete of task A1
  through board A2** → `404`; **delete of task A1 through Project B** →
  `404` (task confirmed still present); ADMIN successfully deletes a task,
  confirmed gone from a follow-up list; OWNER successfully deletes
  another; deleting an already-gone task → `404`.
- **Database integrity, verified with direct SQL:** zero orphaned `tasks`
  rows (no matching `board_id`); zero rows where a task's `project_id`
  disagreed with its board's `project_id`; zero negative `position`
  values; zero `NULL` `priority` values.
- **Regression:** Phase 3 (health, health/db, 404, malformed JSON,
  oversized body, CORS), Phase 4 (login — valid and invalid, `/auth/me`),
  Phase 5 (public profile, `/users/me`, profile update, search), Phase 6
  (project list/detail/update, membership list, role change, cross-project
  isolation), and Phase 7 (board list/detail/update, board/project
  isolation) all confirmed unaffected.
- Server log inspected directly: no password, password hash, JWT, or
  `DATABASE_URL`/`JWT_SECRET` value appeared anywhere in it.
- Seed re-run twice: identical counts both times (including the 40
  pre-existing seeded tasks), confirming this phase's changes don't affect
  seed idempotency.

## Current limitations

- **No task assignment.** `TaskAssignee` exists in the schema but nothing
  in this phase creates, reads, or deletes a row in it — that's Phase 9.
- **No comments, notifications, or activity-feed writes** from this
  module — Phases 10 and 11.
- **No drag-and-drop reordering algorithm** — `position` can be set
  directly, but there's no "move this task between these two others"
  endpoint that renumbers/rebalances automatically, matching the same
  limitation already documented for boards.
- **No uniqueness constraint on `(boardId, position)`** — two tasks on the
  same board can technically share a position value; ordering stays
  deterministic (via the `createdAt`/`id` tiebreakers) but this isn't
  prevented at creation.
- **No status field, by design** — see [above](#a-deliberate-non-change-no-status-field).
