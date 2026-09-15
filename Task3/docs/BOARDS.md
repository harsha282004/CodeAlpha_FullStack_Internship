# TaskFlow — Project Boards (Phase 7)

This document covers board CRUD: the ordered columns each project
organizes its work into. For where this fits in the overall system, see
[ARCHITECTURE.md](./ARCHITECTURE.md#12-boardtask-relationship). For project
membership and roles (`requireProjectMember`, `requireProjectRole`), see
[PROJECTS.md](./PROJECTS.md) — this module reuses that authorization layer
unchanged rather than reimplementing it.

**Scope: board structure only.** A board is currently an empty column with
a name and a position — nothing lives inside one yet. Task cards, which
boards exist to hold, are **planned for Phase 8** and are not implemented
here. Nothing in this document should be read as claiming otherwise.

## Board purpose

A board is one column of a project's workflow — "To Do," "In Progress,"
"Done," or whatever names a project chooses (board names are free-text
project data, not a fixed enum, so different teams can define different
workflows). A board belongs to exactly one project and will, once Phase 8
exists, contain that project's task cards.

## File layout

```
server/src/
├── controllers/board.controller.js   — thin: validate → call service → respond
├── routes/board.routes.js            — mounted from project.routes.js
├── services/board.service.js         — all board database access + business logic
├── validators/board.validator.js
└── utils/board.js                    — toBoardSummary()
```

Same layered flow as every other route in this project:

```
Route → Middleware (auth + project membership + role) → Controller → Service → Prisma → PostgreSQL
```

## Database

**No schema change.** The Phase 2 `Board` model already had every field
this phase needed:

```prisma
model Board {
  id        String   @id @default(uuid()) @db.Uuid
  projectId String   @map("project_id") @db.Uuid
  name      String
  position  Int
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  tasks   Task[]
}
```

Confirmed via `prisma migrate status` before and after implementation —
"Database schema is up to date!" both times.

**`tasks Task[]` and `Task.board`'s `onDelete: Cascade`, inspected before
writing any code:** deleting a board would cascade-delete any tasks filed
under it. Phase 8 hasn't introduced task creation yet, so no `Task` row
can currently reference any board — this cascade is inert today, but it's
documented here deliberately so it isn't a surprise once task creation
exists. Nothing in Phase 7 creates or deletes task data; the cascade is a
schema-level fact being verified and recorded, not a new behavior being
added.

## Routes

Mounted at `/api/projects/:projectId/boards`
(`server/src/routes/board.routes.js`, mounted from `project.routes.js` via
`router.use('/:projectId/boards', requireProjectMember(), boardRoutes)`).
Every route requires `Authorization: Bearer <token>` and project
membership; two additionally require `OWNER`/`ADMIN`:

| Method | Path | Additional gate | Purpose |
|---|---|---|---|
| `POST` | `/` | — (any member) | Create a board |
| `GET` | `/` | — (any member) | List this project's boards, ordered by `position` |
| `GET` | `/:boardId` | — (any member) | Board detail |
| `PATCH` | `/:boardId` | `OWNER`/`ADMIN` | Rename and/or reorder |
| `DELETE` | `/:boardId` | `OWNER`/`ADMIN` | Delete the board |

`board.routes.js` is a real Express `Router({ mergeParams: true })` — it
needs the parent `:projectId`, which `mergeParams` makes visible without
redeclaring the path segment. `requireProjectMember()` is applied once, at
the mount point in `project.routes.js`, covering every board route
uniformly; `requireProjectRole('OWNER', 'ADMIN')` is then added per-route
for the two operations that need it. Nothing here duplicates the
membership lookup — it happens exactly once per request, in the same
middleware Phase 6 already established.

## Authorization

Any project member (`OWNER`, `ADMIN`, or `MEMBER`) may create, list, and
view boards — a board is workflow structure the whole team works within,
not something to gate behind elevated permissions. Only `OWNER`/`ADMIN` may
rename, reorder, or delete one — the same `requireProjectRole('OWNER', 'ADMIN')`
used for `PATCH /api/projects/:projectId` in Phase 6, reused verbatim, not
reimplemented as a separate "board permission" concept.

No role is ever trusted from the request — `req.projectMembership.role`
always comes from the `ProjectMember` row `requireProjectMember` looked up
fresh from PostgreSQL for this specific request.

## Board-level isolation

**A board id from Project A must never be reachable through Project B's
URL** — this is checked on every read and write, not only the detail
route. `board.service.js`'s internal `getBoardWithinProject(projectId, boardId)`
is the single place this is verified, and `getBoard`, `updateBoard`, and
`deleteBoard` all call it first:

```js
async function getBoardWithinProject(projectId, boardId) {
  if (!UUID_REGEX.test(boardId)) throw boardNotFoundError()

  const board = await prisma.board.findUnique({ where: { id: boardId }, select: BOARD_SELECT })
  if (!board || board.projectId !== projectId) throw boardNotFoundError()
  return board
}
```

A board that belongs to a different project produces the **exact same**
`404 BOARD_NOT_FOUND` a genuinely nonexistent board would — never a `403`,
never any detail suggesting the id was "real" but just misplaced. This is
deliberately different from the project-level 403-vs-404 distinction in
[PROJECTS.md](./PROJECTS.md#authorization-design): a board has no identity
worth confirming independently of its project, so there's nothing true a
`403` could say here that a `404` doesn't already cover.

## Board ordering / position

Boards are ordered by `position` ascending (with `createdAt` ascending as a
tiebreaker, for full determinism if two boards ever share a position
value — Phase 7 doesn't prevent that, since it does no
collision/renumbering logic).

**Creating a board without a `position` auto-assigns the next one:**

```js
async function nextPosition(projectId) {
  const result = await prisma.board.aggregate({ where: { projectId }, _max: { position: true } })
  return (result._max.position ?? -1) + 1
}
```

`MAX(position) + 1` for the project, or `0` for the first board — computed
fresh from the current rows every time, not a stored counter that could
drift. The frontend never has to calculate a position itself. Supplying
`position` explicitly is still allowed (validated as a non-negative
integer), but Phase 7 does no drag-and-drop reordering algorithm — a
future phase can renumber or move to fractional positions if a real
reordering UI needs it.

## Validation

`board.validator.js` mirrors the whitelist discipline established in
Phases 5 and 6:

| Field | Create | Update | Rule |
|---|---|---|---|
| `name` | required | optional | non-empty after trim, ≤100 characters |
| `position` | optional (auto-assigned if omitted) | optional | non-negative integer |

Any other field (`projectId` included — the parent project always comes
from the URL, never the body) is rejected with `400`, the same as an
empty update body. `projectId` is deliberately not an accepted field
anywhere in this module: accepting it would mean a client could try to
point a board creation or update at a different project than the one in
the URL, which the whitelist makes structurally impossible rather than a
check someone has to remember to add.

## Error handling

Follows the existing `AppError`/`errorHandler` conventions unchanged:

| Status | Meaning | Example |
|---|---|---|
| `400` | Invalid input | Empty name, unsupported field, invalid `position` |
| `401` | Not authenticated | No/invalid JWT |
| `403` | Authenticated, not authorized | Non-member; `MEMBER` attempting update/delete |
| `404` | Not found / wrong parent | Nonexistent project or board; board from a different project |

No stack traces, no Prisma internals, no database details in any response.

## Security considerations

- **No board ever appears in, or is reachable from, the wrong project** —
  verified structurally (one shared check, called by every operation) and
  directly during testing (see below).
- **No role is ever trusted from the client** — same discipline as Phase 6,
  reused rather than reimplemented.
- **`projectId` cannot be supplied in a request body** — the only source of
  truth for which project a board belongs to is the URL, checked against
  the database.
- **Logging:** the request logger records method/path/status/duration
  only. Nothing in this module logs a password, a JWT, a connection
  string, or a request body.

### What was verified

Every scenario below was exercised against a running server backed by the
real PostgreSQL container, using four accounts (owner, admin, member,
outsider) across two independently owned projects:

- **Authentication:** all five endpoints (create, list, detail, update,
  delete) reject an unauthenticated request with `401`.
- **Project access:** OWNER, ADMIN, and MEMBER can all create/list/view
  boards; a genuine non-member gets `403` on every one of those.
- **Create:** valid → `201`; empty name → `400`; missing name → `400`;
  unsupported field (`projectId`) → `400`; three sequential creates with no
  `position` supplied assigned `0`, `1`, `2` automatically.
- **List:** returns only the requested project's boards, in ascending
  `position` order; a different project's (empty) list never contains
  another project's boards.
- **Detail:** correct project + board → `200`; **the board from Project A
  requested through Project B's URL** (by Project B's own legitimate
  owner) → `404 BOARD_NOT_FOUND`, identical to a genuinely nonexistent
  board; nonexistent board → `404`; nonexistent project → `404`.
- **Update:** OWNER renames → `200`; ADMIN reorders (`position`) → `200`;
  MEMBER attempts update → `403`; non-member attempts update → `403`;
  empty body → `400`; unsupported field (`projectId`) → `400`; negative
  `position` → `400`; non-integer `position` (`1.5`) → `400`; **update of
  Project A's board through Project B's URL** → `404`, not silently
  applied to the wrong project's board.
- **Delete:** MEMBER attempts delete → `403`; non-member attempts delete →
  `403`; **delete of Project A's board through Project B's URL** → `404`
  (board left untouched); ADMIN successfully deletes a board, confirmed
  gone from a follow-up list; OWNER successfully deletes another; deleting
  an already-gone/nonexistent board → `404`.
- **Database integrity, verified with direct SQL after the deletes above:**
  zero orphaned `boards` rows (a `LEFT JOIN` against `projects` with no
  match, across the whole table); zero negative `position` values anywhere.
- **Regression:** Phase 3 (health, health/db, 404, malformed JSON,
  oversized body, CORS), Phase 4 (login — valid and invalid, `/auth/me`),
  Phase 5 (public profile, `/users/me`, profile update, search), and
  Phase 6 (project list/detail/update, membership list, role change,
  cross-project isolation, project delete) all confirmed unaffected.
- Server log inspected directly: no password, password hash, JWT, or
  `DATABASE_URL`/`JWT_SECRET` value appeared anywhere in it.
- Seed re-run twice: identical counts both times (including the 16
  pre-existing seeded boards, 4 per seeded project), confirming this
  phase's changes don't affect seed idempotency.

## Current limitations

- No drag-and-drop reordering algorithm — `position` can be set directly,
  but there's no endpoint for "move this board between these two others"
  that renumbers/rebalances automatically. A later phase can add
  fractional or gap-based positions if a real reordering UI needs it.
- No uniqueness constraint on `(projectId, position)` — two boards in the
  same project can technically share a position value; ordering stays
  deterministic (via the `createdAt` tiebreaker) but this isn't prevented
  at creation. Acceptable for this phase's scope; worth revisiting if
  Phase 8+ reordering needs a stronger guarantee.
- **No task cards.** A board has nothing inside it yet — that's Phase 8.
