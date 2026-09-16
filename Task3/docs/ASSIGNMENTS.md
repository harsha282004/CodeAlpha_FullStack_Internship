# TaskFlow — Task Assignment (Phase 9)

This document covers the `TaskAssignee` relationship: assigning project
members to tasks. For where this fits in the overall system, see
[ARCHITECTURE.md](./ARCHITECTURE.md#13-task-assignment-model). For project
membership/roles and task CRUD, see [PROJECTS.md](./PROJECTS.md) and
[TASKS.md](./TASKS.md) — this module reuses that authorization layer
unchanged rather than reimplementing it.

**Scope: assigning/unassigning members to a task, only.** This phase
implements adding an assignee, removing one, listing a task's assignees,
and checking whether a specific member is assigned. It does **not**
implement:

- **Task comments** — **Phase 10**
- **Notifications** — **Phase 11** (including notifying someone when
  they're assigned — the schema's `NotificationType.TASK_ASSIGNED` exists
  for this, but nothing in this phase writes a `Notification` row)
- **Socket.IO / real-time updates** — **Phase 12**
- **Frontend UI** of any kind

Nothing in this document should be read as claiming any of those exist yet.

## The relationship

```
Project
    ↓ (ProjectMember: who belongs to this project, and with what role)
Board
    ↓
Task
    ↓ (TaskAssignee: which project members are assigned to this task)
User
```

A `TaskAssignee` row links a `Task` to a `User`. The rule this entire phase
exists to enforce: **that `User` must already have a `ProjectMember` row
for the task's project.** Nothing in the schema can require this — a
`TaskAssignee` and a `ProjectMember` share no foreign key, so Prisma has no
way to declare "this user must be a member of that project" as a database
constraint. It's enforced in `assignment.service.js` instead, checked
before every assignment is created.

## File layout

```
server/src/
├── controllers/assignment.controller.js  — thin: validate → call service → respond
├── middleware/taskAuth.middleware.js     — requireTaskInBoard (new this phase)
├── routes/assignment.routes.js           — mounted from task.routes.js
├── services/assignment.service.js        — all assignment database access + business logic
├── validators/assignment.validator.js
└── utils/assignment.js                   — toAssigneeSummary()
```

Same layered flow as every other route in this project:

```
Route → Middleware (auth + project membership + board-in-project + task-in-board) → Controller → Service → Prisma → PostgreSQL
```

## Database

**No schema change.** The Phase 2 `TaskAssignee` model already had every
field this phase needed:

```prisma
model TaskAssignee {
  taskId     String   @map("task_id") @db.Uuid
  userId     String   @map("user_id") @db.Uuid
  assignedAt DateTime @default(now()) @map("assigned_at")

  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([taskId, userId])
}
```

Confirmed via `prisma migrate status` before and after implementation —
"Database schema is up to date!" both times. The composite primary key
`(taskId, userId)` is what makes a duplicate assignment structurally
impossible, independent of any application-level check (see
[Duplicate assignment](#duplicate-assignment) below).

## Routes

Mounted at
`/api/projects/:projectId/boards/:boardId/tasks/:taskId/assignees`
(`server/src/routes/assignment.routes.js`, a `Router({ mergeParams: true })`
mounted from `task.routes.js` via
`router.use('/:taskId/assignees', requireTaskInBoard(), assignmentRoutes)`).
Every route requires `Authorization: Bearer <token>`, project membership,
and a fully-verified project → board → task hierarchy; two additionally
require `OWNER`/`ADMIN`:

| Method | Path | Additional gate | Purpose |
|---|---|---|---|
| `POST` | `/` | `OWNER`/`ADMIN` | Assign a project member to the task |
| `GET` | `/` | — (any member) | List the task's assignees |
| `GET` | `/:userId` | — (any member) | Check whether that member is assigned |
| `DELETE` | `/:userId` | `OWNER`/`ADMIN` | Remove the assignment |

## Authorization

**Only `OWNER`/`ADMIN` may assign or remove an assignee.** Any project
member may list assignees or check a specific member's assignment status —
knowing who's working on a task is shared, read-only information; deciding
who's *assigned* is a management action, matching Phase 6's existing
asymmetry (any member reads, `OWNER`/`ADMIN` writes) for membership itself.

No role is ever trusted from the request. `req.projectMembership.role`
always comes from the `ProjectMember` row `requireProjectMember` looked up
fresh from PostgreSQL for this request; the requester's identity is always
`req.user.id` from the verified JWT, never a body field.

## Add assignee

`POST /` — requires `OWNER`/`ADMIN`.

```json
{ "userId": "<existing-project-member-id>" }
```

`assignment.service.js`'s `addAssignee` runs, in order:

1. **Does the target user exist at all?** `404 USER_NOT_FOUND` if not.
2. **Is the target user a member of *this* project?** — a
   `prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId } } })`
   lookup. `404 USER_NOT_A_PROJECT_MEMBER` if not. This is the check that
   makes "assign someone from another project" structurally impossible,
   regardless of whether that user exists globally.
3. **Create the `TaskAssignee` row.** A `P2002` here (the composite primary
   key firing) means the pair already existed — caught and converted to
   `409 ASSIGNMENT_ALREADY_EXISTS`, never a raw Prisma error.

```json
{
  "success": true,
  "data": {
    "assignee": {
      "id": "...", "name": "...", "username": "...", "avatarUrl": null,
      "assignedAt": "2026-09-16T04:19:50.058Z"
    }
  }
}
```

### Why a `404`, not a `403`, for "target isn't a project member"

`403` in this codebase means "the requester lacks permission." That's not
what's true here — the requester was already confirmed `OWNER`/`ADMIN` by
`requireProjectRole` before `addAssignee` ever runs. The problem is with
the *target*, not the requester: this `userId` doesn't resolve to someone
assignable in this project. That's the same kind of fact a `404` for
"nonexistent user" already expresses, just with a distinct `code`
(`USER_NOT_A_PROJECT_MEMBER` vs. `USER_NOT_FOUND`) so a client can tell the
two apart if it needs to.

## List assignees

`GET /` — any project member.

```json
{
  "success": true,
  "data": {
    "assignees": [
      { "id": "...", "name": "...", "username": "...", "avatarUrl": null, "assignedAt": "..." }
    ]
  }
}
```

Ordered by `assignedAt` ascending — "who was assigned first," the same
deterministic-ordering approach `ProjectMember` uses for `joinedAt`. Only
public-facing user fields: `id`, `name`, `username`, `avatarUrl` — never
`email`, never `passwordHash`.

## Assignment status

`GET /:userId` — any project member.

Returns the same shape as an item in the list above if the specified user
is assigned (`200`), or `404 ASSIGNMENT_NOT_FOUND` if not — including for
a `:userId` that isn't even a project member. This is deliberate, not an
oversight: a `TaskAssignee` row can only exist for someone who *was* a
project member at the moment they were assigned (enforced by `addAssignee`
above), so its absence already means "not assigned" regardless of why —
there's no separate "this user isn't eligible" case to distinguish on a
read-only status check.

A malformed (non-UUID) `:userId` is treated the same way — `404`, not a
`400` — consistent with how every other hierarchy check in this project
(`requireProjectMember`, `getBoardWithinProject`, `getTaskWithinBoard`)
treats a path segment that can never match a real row.

## Remove assignee

`DELETE /:userId` — requires `OWNER`/`ADMIN`.

Looks up the `TaskAssignee` row by its composite key; `404 ASSIGNMENT_NOT_FOUND`
if it doesn't exist, otherwise deletes it. **Removes only the
`TaskAssignee` row.** The `User`, their `ProjectMember` row, and the `Task`
itself are all untouched — `TaskAssignee` is a pure join row with no
children of its own to cascade, and nothing in this operation touches any
other table. Verified directly after every removal during testing.

## Duplicate assignment

Prevented at the database level by the composite primary key
`(taskId, userId)` — not merely by an application-side pre-check. This
matters for concurrency: two simultaneous `POST` requests for the same
`taskId`/`userId` pair can both pass `addAssignee`'s membership checks (a
read), but only one of the two subsequent `create` calls can succeed;
Postgres rejects the second with `P2002`, which `addAssignee` maps to a
clean `409`. No `$transaction` wraps the membership checks and the insert
— the same reasoning `membership.service.js`'s `addMember` already
established for duplicate `ProjectMember` rows: the primary key is the
real guarantee, and wrapping a read-then-write in a transaction wouldn't
add one the key doesn't already provide.

## Isolation

Every assignee route sits behind the complete, already-established
hierarchy chain — `requireProjectMember` → `requireBoardInProject` →
`requireTaskInBoard` — before any assignment-specific code runs. This
means, without any assignment-specific isolation logic of its own:

- **A nonexistent project, board, or task** each resolve to their own
  `404` at the appropriate level (`PROJECT_NOT_FOUND`, `BOARD_NOT_FOUND`,
  `TASK_NOT_FOUND`) — assignment code never even runs.
- **A task from a sibling board in the same project, or from an entirely
  different project,** is rejected as `404 TASK_NOT_FOUND` by
  `requireTaskInBoard` — an assignment "belonging to" that task can never
  be reached through the wrong URL, because the task itself never
  resolves.
- **A user who is only a member of a different project** is rejected by
  `addAssignee`'s own membership check (`USER_NOT_A_PROJECT_MEMBER`) — see
  [Add assignee](#add-assignee) above. This is the one isolation rule
  specific to this module, since it's about the *target* of the
  operation, not the caller or the resource hierarchy.

## Validation

`assignment.validator.js` accepts exactly one field on `POST /`:

| Field | Rule |
|---|---|
| `userId` | required, must be a syntactically valid UUID |

Any other field (`taskId`, `projectId`, `boardId`, `role`, a requester
identity field, timestamps — anything) is rejected with `400`. An empty
body, a missing `userId`, or a malformed `userId` all fail the same check
(`userId must be a valid user id`) — there's no meaningful difference
between "you didn't send it" and "you sent something that isn't a real
id" from the validator's point of view.

## Error handling

Follows the existing `AppError`/`errorHandler` conventions unchanged:

| Status | Meaning | Example |
|---|---|---|
| `400` | Invalid input | Missing/malformed `userId`, unsupported field |
| `401` | Not authenticated | No/invalid JWT |
| `403` | Authenticated, not authorized | Non-member; `MEMBER` attempting add/remove |
| `404` | Not found / wrong hierarchy / ineligible target | Nonexistent project/board/task/user; task from elsewhere; target not a project member; no such assignment |
| `409` | Conflict | Duplicate assignment |

No stack traces, no Prisma internals, no database details in any response.

## Security considerations

- **An assignee can never be a non-member of the task's project** —
  enforced in application code before every `TaskAssignee` insert, and
  verified directly against the database (new assignments and all
  pre-existing seed data together) with zero violations.
- **No role is ever trusted from the client** — same discipline as every
  prior phase, reused rather than reimplemented.
- **Removing an assignment never touches `User`, `ProjectMember`, or
  `Task`** — confirmed directly after every removal during testing.
- **Logging:** the request logger records method/path/status/duration
  only. Nothing in this module logs a password, a JWT, a connection
  string, or a request body.

### What was verified

Every scenario below was exercised against a running server backed by the
real PostgreSQL container, using five accounts (owner, admin, two members,
and an outsider who owns a second, independent project with its own
member) across two boards in one project and a second project entirely:

- **Authentication:** all four endpoints reject an unauthenticated request
  with `401`.
- **Hierarchy:** nonexistent project/board/task each `404` at the correct
  level; a task requested via a sibling board in the same project `404`;
  a task requested via an entirely different project `404`.
- **Add:** OWNER and ADMIN both assign successfully (`201`); MEMBER `403`;
  non-member requester `403`; nonexistent target user `404`; **a user who
  belongs only to a different project (Project B) rejected with
  `404 USER_NOT_A_PROJECT_MEMBER`** when assignment to a Project A task was
  attempted; duplicate assignment `409`; malformed `userId` `400`;
  unsupported field (`taskId`) `400`; missing `userId` `400`.
- **List:** any member can list; safe fields only (no `passwordHash`, no
  `email`); deterministic `assignedAt` order confirmed (first-assigned
  appeared first); non-member `403`.
- **Status:** assigned member → `200` with correct details; an unassigned
  user who isn't even a project member → `404`; non-member requester →
  `403`.
- **Remove:** MEMBER `403`; non-member `403`; **removal attempted through
  the wrong board `404`s** without touching the real assignment (confirmed
  by re-checking status afterward — still assigned); **an assignment from
  Task A is inaccessible through a different task's URL** (`404`); ADMIN
  successfully removes one assignment, OWNER successfully removes another,
  each confirmed via a follow-up status check now returning `404`;
  removing an already-gone assignment → `404`.
- **Preservation, checked explicitly after every removal:** the target
  `User` still resolves via the public profile endpoint; their
  `ProjectMember` row still appears in the project's member list; the
  `Task` itself still returns `200` on detail.
- **Database integrity, verified with direct SQL:** zero orphaned
  `task_assignees` rows (no matching `task_id`); zero duplicate
  `(task_id, user_id)` pairs anywhere in the table; zero assignees — across
  every row in the table, new test data and all 60 pre-existing seeded
  assignments together — who aren't a `ProjectMember` of their assigned
  task's project.
- **Regression:** Phase 3 (health, health/db, 404, malformed JSON,
  oversized body, CORS), Phase 4 (login — valid and invalid, `/auth/me`),
  Phase 5 (public profile, `/users/me`, profile update, search), Phase 6
  (project list/detail/update, membership list, role change, cross-project
  isolation), Phase 7 (board list/detail/update, board/project isolation),
  and Phase 8 (task list/detail/update, task/board/project isolation) all
  confirmed unaffected.
- Server log inspected directly: no password, password hash, JWT, or
  `DATABASE_URL`/`JWT_SECRET` value appeared anywhere in it.
- Seed re-run twice: identical counts both times (including the 60
  pre-existing seeded assignments), confirming this phase's changes don't
  affect seed idempotency.

## Current limitations

- **No bulk assignment** — one `POST`/`DELETE` per user; no endpoint
  accepts a list of users to assign/unassign in one request.
- **No "assign me" self-service shortcut** — a `MEMBER` who wants to pick
  up a task must ask an `OWNER`/`ADMIN` to assign them; this phase doesn't
  add a lower-privilege path for self-assignment. Revisit if the
  collaboration model calls for it later.
- ~~No notification on assignment~~ **Implemented in Phase 11:**
  `addAssignee` now creates a `TASK_ASSIGNED` notification for the newly
  assigned user (skipped for a self-assignment) and emits a real-time
  `task:assigned` event (Phase 12) — see
  [NOTIFICATIONS.md](./NOTIFICATIONS.md) and [REALTIME.md](./REALTIME.md).
- **No assignee-specific task permissions** — Phase 8 already noted this:
  "only the assignee (or an admin) can update this task" isn't
  implemented; any project member can still update any task's content
  regardless of assignment.
