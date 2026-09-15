# TaskFlow — Projects & Membership (Phase 6)

This document covers project CRUD, OWNER/ADMIN/MEMBER membership, and the
authorization layer this phase establishes. For where this fits in the
overall system, see [ARCHITECTURE.md](./ARCHITECTURE.md#10-authorization-architecture).
For authentication itself (JWT, `requireAuth`), see
[AUTHENTICATION.md](./AUTHENTICATION.md) — this module builds directly on
top of it and does not repeat that detail here.

Scope: project CRUD, membership, and role-based authorization only. There
are no boards, tasks, comments, notifications, or frontend UI yet — those
are later phases, and this module deliberately doesn't reach for them
(no activity-feed rows are written here, for instance, even though the
`Activity` model already exists from Phase 2 — wiring that up belongs to
whichever phase actually needs a project timeline).

## File layout

```
server/src/
├── controllers/
│   ├── project.controller.js       — thin: validate → call service → respond
│   └── membership.controller.js
├── middleware/
│   └── projectAuth.middleware.js   — requireProjectMember, requireProjectRole
├── routes/
│   └── project.routes.js           — project CRUD + nested /:projectId/members/*
├── services/
│   ├── project.service.js          — all project database access + business logic
│   └── membership.service.js       — all membership database access + business logic
├── validators/
│   ├── project.validator.js
│   └── membership.validator.js
└── utils/
    └── project.js                  — toProjectSummary(), toMemberSummary()
```

Same layered flow as every other route in this project:

```
Route → Middleware (auth + authorization) → Controller → Service → Prisma → PostgreSQL
```

## Database

**No schema change.** The Phase 2 schema already had everything this phase
needed: `Project`, `ProjectMember` (composite `(projectId, userId)` primary
key — a user can't join the same project twice), and the `ProjectRole` enum
(`OWNER`, `ADMIN`, `MEMBER`). Confirmed via `prisma migrate status` before
and after implementation — "Database schema is up to date!" both times.

## Routes

Mounted at `/api/projects` (`server/src/routes/index.js`). Every route
requires `Authorization: Bearer <token>` (`requireAuth`, applied once via
`router.use()` at the top of `project.routes.js`).

| Method | Path | Additional gate | Purpose |
|---|---|---|---|
| `POST` | `/` | — | Create a project; caller becomes `OWNER` |
| `GET` | `/` | — | List only the caller's own projects, paginated |
| `GET` | `/:projectId` | `requireProjectMember` | Project detail + caller's role |
| `PATCH` | `/:projectId` | member, then `OWNER`/`ADMIN` | Update `name`/`description` |
| `DELETE` | `/:projectId` | member, then `OWNER` only | Delete the project |
| `POST` | `/:projectId/members` | member, then `OWNER`/`ADMIN` | Add an existing user |
| `GET` | `/:projectId/members` | `requireProjectMember` | List members |
| `DELETE` | `/:projectId/members/:userId` | member, then `OWNER`/`ADMIN` | Remove a member |
| `PATCH` | `/:projectId/members/:userId` | member, then `OWNER` only | Change a member's role |

`project.routes.js` holds both the project routes and the nested
`/:projectId/members/*` routes in one file — they need the same
`:projectId` param and there's no static-vs-dynamic route-ordering hazard
here (unlike `/search` vs. `/:username` in the profile module), so a
separate nested router would add indirection without solving anything.

## Authorization design

Two middleware, always run in this order after `requireAuth`
(`server/src/middleware/projectAuth.middleware.js`):

```js
router.patch(
  '/:projectId',
  requireProjectMember(),                  // "are you in this project, and what's your role?"
  requireProjectRole('OWNER', 'ADMIN'),    // "is that role allowed to do this?"
  updateProjectController,
)
```

### `requireProjectMember()`

Looks up `req.user.id`'s `ProjectMember` row for `:projectId` — from
PostgreSQL, every request, never cached or trusted from anything the
client sent — and attaches `req.projectMembership = { projectId, role }`
for everything downstream.

- Membership found → attach it, continue.
- No membership, but the project exists → `403 NOT_A_PROJECT_MEMBER`.
- Project doesn't exist at all (including a malformed, non-UUID
  `:projectId`, which can never match a real row) → `404 PROJECT_NOT_FOUND`.

This is the deliberate distinction the spec calls for: a non-member learns
nothing about a project beyond what a generic 404 already tells everyone,
but a genuinely missing project isn't quietly reported as if it existed and
merely excluded them.

### `requireProjectRole(...allowedRoles)`

Must run after `requireProjectMember()`. Checks the role already attached
to `req.projectMembership` against an explicit list —
`requireProjectRole('OWNER')` or `requireProjectRole('OWNER', 'ADMIN')` —
and rejects with `403 INSUFFICIENT_PROJECT_ROLE` otherwise. An allow-list
rather than a single "minimum role" threshold, since only those two
combinations are ever used; a full role ordering would be more machinery
than two cases justify.

**Neither middleware ever trusts a role from the request.** The role in
`req.projectMembership` always comes from the `ProjectMember` row looked up
in the same request — never a JWT claim (the JWT only ever contains `sub`,
per [AUTHENTICATION.md](./AUTHENTICATION.md#jwt-design)), never a body
field, never a query parameter.

## Project lifecycle

### Create — `POST /api/projects`

```json
{ "name": "Website Relaunch", "description": "Redesign the marketing site." }
```

Only `name` (required, trimmed, ≤100 chars) and `description` (optional,
trimmed, ≤2000 chars, empty string stored as `null`) are accepted — any
other field (e.g. `ownerId`) is a `400`, the same whitelisting pattern used
throughout this project.

The project row and the creator's `ProjectMember` row (`role: OWNER`) are
created together in one `prisma.$transaction` — a project can never exist
without its owner membership, even across a crash mid-request:

```js
const project = await prisma.$transaction(async (tx) => {
  const created = await tx.project.create({ data: { name, description, ownerId } })
  await tx.projectMember.create({ data: { projectId: created.id, userId: ownerId, role: 'OWNER' } })
  return created
})
```

Response: `201`, `{ project: { id, name, description, createdAt, updatedAt, role: "OWNER", memberCount: 1 } }`.

### List — `GET /api/projects?page=&limit=`

Queries **through** `ProjectMember`, not `Project` with an after-the-fact
filter:

```js
prisma.projectMember.findMany({ where: { userId }, select: { role: true, project: { select: {...} } } })
```

A project the caller doesn't belong to is never fetched from the database
in the first place — confirmed during testing: a user with zero
memberships gets `{ projects: [], pagination: { total: 0, ... } } }`, not
an error, and a user's list never contains another user's private project.
Paginated the same way as user search (`page` default `1`, `limit` default
`20`, max `50`, both must be positive integers or `400`), ordered by
`createdAt` descending, `count()` and `findMany()` run concurrently.

### Detail — `GET /api/projects/:projectId`

Gated by `requireProjectMember()` alone (any role may read). Returns the
project plus the caller's own role and a member count:

```json
{ "project": { "id": "...", "name": "...", "description": "...", "createdAt": "...", "updatedAt": "...", "role": "MEMBER", "memberCount": 4 } }
```

### Update — `PATCH /api/projects/:projectId`

Gated by `requireProjectRole('OWNER', 'ADMIN')`. Only `name`/`description`
are editable — `id`, `ownerId`, `createdAt`, `updatedAt`, `role`, or any
membership field in the body is a `400`, not a silently-ignored field. An
empty body is also a `400`. Partial updates are supported (only fields
present in the body are written).

### Delete — `DELETE /api/projects/:projectId`

Gated by `requireProjectRole('OWNER')` — the strictest gate in this module.
A single `prisma.project.delete({ where: { id } })` is already atomic and
leaves nothing orphaned: `ProjectMember`, `Board`, `Task`, and this
project's own `Notification`/`Activity` rows all cascade at the schema
level (`onDelete: Cascade`, declared in Phase 2 — see
[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)). No application-level
transaction is needed to coordinate multiple deletes by hand; Postgres's
own foreign-key cascade does that in one statement. Verified directly
against the database after a real delete: zero remaining
`project_members` rows for that project id, and zero duplicate
`(project_id, user_id)` pairs anywhere in the table.

## Membership lifecycle

### Add — `POST /api/projects/:projectId/members`

Gated by `requireProjectRole('OWNER', 'ADMIN')`.

```json
{ "userId": "<existing-user-id>", "role": "MEMBER" }
```

- `role` defaults to `MEMBER` when omitted.
- `role` must be `ADMIN` or `MEMBER` — **`OWNER` is not an accepted value
  here at all**, rejected by `membership.validator.js` before the request
  ever reaches a service or Prisma. There is exactly one OWNER per project,
  assigned once at creation; this endpoint cannot create a second one.
- Target user must exist (`404 USER_NOT_FOUND` otherwise).
- Duplicate membership → `409 MEMBERSHIP_ALREADY_EXISTS`, mapped from
  Prisma's `P2002` on the `(projectId, userId)` primary key — the real
  guarantee against duplicates is that constraint, not just the read-first
  existence check.

### List — `GET /api/projects/:projectId/members`

Gated by `requireProjectMember()` alone. Returns only safe fields per
member — never `passwordHash`, never `email`:

```json
{ "members": [ { "id": "...", "name": "...", "username": "...", "avatarUrl": null, "role": "OWNER", "joinedAt": "..." } ] }
```

Ordered by `role` ascending, then `joinedAt` ascending. Postgres enums sort
by declaration order — `OWNER, ADMIN, MEMBER` in `schema.prisma` — so this
naturally lists the owner first, then admins, then members, without an
explicit `CASE` expression.

### Remove — `DELETE /api/projects/:projectId/members/:userId`

Gated by `requireProjectRole('OWNER', 'ADMIN')`. The target must be an
existing member (`404 MEMBERSHIP_NOT_FOUND` otherwise). **The owner can
never be removed through this endpoint — by an admin, or even by the owner
themself:**

```js
if (membership.role === 'OWNER') {
  throw new AppError('The project owner cannot be removed', 403, 'CANNOT_REMOVE_OWNER')
}
```

This check runs regardless of the caller's own role — it's a property of
the *target*, not the caller. Leaving ownership behind is
`DELETE /api/projects/:projectId`, not member removal.

### Change role — `PATCH /api/projects/:projectId/members/:userId`

Gated by `requireProjectRole('OWNER')` — the only membership-management
endpoint an ADMIN cannot use. Supports exactly two transitions:
`MEMBER → ADMIN` and `ADMIN → MEMBER`.

- `role` must be `ADMIN` or `MEMBER` (same validator as add-member —
  `OWNER` is never an accepted value, so "promote someone to OWNER through
  this endpoint" is rejected before the service layer even runs).
- The target's *current* role is also checked: if it's already `OWNER`,
  the request is refused (`403 CANNOT_CHANGE_OWNER_ROLE`) — this endpoint
  changes between ADMIN and MEMBER only and never touches the owner's row,
  even when the OWNER is the one making the request.

## Security considerations

- **No role is ever trusted from the client.** Every authorization decision
  reads `ProjectMember.role` from PostgreSQL in the same request; nothing
  is cached from a previous request, a JWT claim, a body field, or a query
  parameter.
- **Non-member vs. nonexistent-project responses are deliberately
  different** (`403` vs. `404`) and deliberately reveal nothing more than
  that distinction — no project name, no member list, no hint about who
  else is in it.
- **Cross-project isolation is structural, not a filter.** Every
  project-scoped route requires `requireProjectMember()` for *that specific
  `:projectId`* — being the OWNER of project A grants zero special access
  to project B. Verified directly during testing with two independently
  created projects.
- **The owner cannot be removed or reassigned through the membership
  endpoints**, full stop — not by an admin, not by another owner-only
  action, not by the owner themself. The only way to stop owning a project
  is to delete it.
- **`passwordHash` and `email` never appear** in any project or membership
  response — member listings use the same public-field discipline as
  Phase 5's public profile (`id`, `name`, `username`, `avatarUrl` — plus
  `role`/`joinedAt`, which aren't user fields at all).
- **Logging:** the request logger records method/path/status/duration
  only. Nothing in this module logs a password, a JWT, a connection
  string, or a request body.

### What was verified

Every scenario below was exercised against a running server backed by the
real PostgreSQL container, using four freshly registered accounts (owner,
admin, member, and a genuine outsider) plus a second, independently owned
project for isolation testing:

- **Create:** unauthenticated → `401`; empty/missing `name` → `400`;
  unsupported field (`ownerId`) → `400`; valid create → `201` with
  `role: "OWNER"`, `memberCount: 1`, and the description trimmed.
- **List:** the creator's list includes the new project; a genuine
  outsider's list is empty (`total: 0`), never leaking another user's
  project; pagination (`page`/`limit`) verified across 3 projects with
  `limit=2` — two pages, no overlap, correct `totalPages`; invalid
  `limit=100` → `400`; `page=0` → `400`.
- **Detail:** member (any role) → `200` with their own role; genuine
  non-member → `403 NOT_A_PROJECT_MEMBER`; nonexistent project id → `404`;
  malformed (non-UUID) project id → `404`.
- **Update:** owner → `200`; admin → `200`; member → `403`; non-member →
  `403`; empty body → `400`; `id` → `400`; `ownerId` → `400`.
- **Add member:** owner adds with explicit role → `201`; owner adds with
  role omitted → defaults to `MEMBER`, `201`; member attempts to add →
  `403 INSUFFICIENT_PROJECT_ROLE`; non-member attempts to add → `403
  NOT_A_PROJECT_MEMBER`; duplicate membership → `409`; nonexistent user id
  → `404`; invalid role string → `400`; `role: "OWNER"` in the body → `400`
  (rejected by validation); admin (not just owner) successfully adds a
  member.
- **List members:** member → `200`, safe fields only, no
  `passwordHash`/`email`, deterministic OWNER→ADMIN→MEMBER ordering;
  non-member → `403`.
- **Remove member:** member attempts removal → `403`; admin attempts to
  remove the owner → `403 CANNOT_REMOVE_OWNER`; owner attempts to remove
  themself → `403 CANNOT_REMOVE_OWNER` (same rule, regardless of caller);
  admin successfully removes an ordinary member, confirmed gone from a
  follow-up member list; owner successfully removes an admin; removing a
  nonexistent membership → `404`.
- **Change role:** owner promotes MEMBER→ADMIN → `200`; owner demotes that
  same user ADMIN→MEMBER → `200`; admin attempts a role change → `403`;
  member attempts a role change → `403`; attempt to change the owner's role
  → `403 CANNOT_CHANGE_OWNER_ROLE`; attempt to set role to `OWNER` → `400`
  (rejected by validation, never reaches the owner-protection check);
  invalid role string → `400`; nonexistent target membership → `404`.
- **Delete:** admin → `403`; member → `403`; non-member → `403`; owner →
  `200`; the project is then genuinely gone (`GET` on it afterward → `404`,
  not stale data).
- **Database integrity, verified with direct SQL after the delete above:**
  zero `project_members` rows referencing the deleted project id; zero
  orphaned `project_members` rows (a `LEFT JOIN` against `projects` with no
  match) anywhere in the table; zero duplicate `(project_id, user_id)`
  pairs anywhere in the table.
- **Cross-project isolation:** a second, independently created project
  (different owner) confirmed the first project's owner gets `403` on that
  project's detail, update, and even an attempt to add themself as a
  member — being an OWNER on one project grants nothing on another.
- **Full regression:** Phase 3 (health, health/db, 404, malformed JSON,
  oversized body, CORS), Phase 4 (login — valid and invalid, `/auth/me` —
  valid and invalid token), and Phase 5 (public profile, `/users/me`,
  search) all confirmed unaffected.
- Server log inspected directly: no password, password hash, JWT, or
  `DATABASE_URL`/`JWT_SECRET` value appeared anywhere in it across the
  entire test run.
