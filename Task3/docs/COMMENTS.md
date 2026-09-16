# TaskFlow — Task Comments (Phase 10)

This document covers the `Comment` model: the threaded discussion on a
task. For where this fits in the overall system, see
[ARCHITECTURE.md](./ARCHITECTURE.md#14-comment-model). For project
membership/roles and task CRUD, see [PROJECTS.md](./PROJECTS.md) and
[TASKS.md](./TASKS.md) — this module reuses that authorization layer
unchanged rather than reimplementing it.

**Scope: the comment itself.** This phase implements creating, listing,
viewing, editing, and deleting comments on a task. It does **not**
implement notifications about comments (that's
[NOTIFICATIONS.md](./NOTIFICATIONS.md), Phase 11, though the trigger for
one *is* wired up here — see [Notifications generated](#notifications-generated)
below) or real-time delivery mechanics (that's
[REALTIME.md](./REALTIME.md), Phase 12, likewise wired up but documented
there). Nothing here implies a frontend comment UI exists.

## File layout

```
server/src/
├── controllers/comment.controller.js   — thin: validate → call service → respond
├── routes/comment.routes.js            — mounted from task.routes.js
├── services/comment.service.js         — all comment database access + business logic
├── validators/comment.validator.js
└── utils/comment.js                    — toCommentSummary()
```

Same layered flow as every other route in this project:

```
Route → Middleware (auth + project membership + board/task hierarchy) → Controller → Service → Prisma → PostgreSQL
```

## Database

**No schema change.** The Phase 2 `Comment` model already had every field
this phase needed:

```prisma
model Comment {
  id        String   @id @default(uuid()) @db.Uuid
  taskId    String   @map("task_id") @db.Uuid
  authorId  String   @map("author_id") @db.Uuid
  content   String   @db.Text
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
}
```

Confirmed via `prisma migrate status` before and after implementation —
"Database schema is up to date!" both times.

## Routes

Mounted at
`/api/projects/:projectId/boards/:boardId/tasks/:taskId/comments`
(`server/src/routes/comment.routes.js`, a `Router({ mergeParams: true })`
mounted from `task.routes.js` as a **sibling** of the assignee routes —
`router.use('/:taskId/comments', requireTaskInBoard(), commentRoutes)` —
reusing the identical hierarchy gate, not a variant of it). Every route
requires `Authorization: Bearer <token>` and the full, already-verified
project → board → task hierarchy:

| Method | Path | Who | Purpose |
|---|---|---|---|
| `POST` | `/` | any member | Create a comment |
| `GET` | `/?page=&limit=` | any member | List, oldest first |
| `GET` | `/:commentId` | any member | Comment detail |
| `PATCH` | `/:commentId` | **author only** | Edit `content` |
| `DELETE` | `/:commentId` | **author, or `OWNER`/`ADMIN`** | Delete (moderation) |

Unlike every other write operation nested under a project (board/task
update, member/assignee add/remove), **there is no `requireProjectRole`
route gate on `PATCH`/`DELETE` here.** Both checks depend on the specific
comment's `authorId`, which no fixed role check can know before the
comment is looked up — so both live inside `comment.service.js` itself,
applied only after `getCommentWithinTask` has already confirmed the
comment exists and belongs to this task.

## Author identity

`authorId` is always `req.user.id` from the verified JWT — never a request
body field. `content` is the *only* field `comment.validator.js` accepts
on create or update; submitting `authorId`, `id`, `taskId`, `createdAt`, or
`updatedAt` is rejected with `400`, the same whitelist discipline used
throughout this project. A client can never author a comment as, or edit a
comment belonging to, someone else by supplying an id.

## Create

`POST /` — any project member.

```json
{ "content": "This task needs the API documentation updated." }
```

- `content`: required, trimmed, non-empty, ≤4000 characters.
- Response: `201`, the safe comment shape (see
  [Safe serialization](#safe-serialization) below).
- Also (see [Notifications generated](#notifications-generated) and
  [REALTIME.md](./REALTIME.md)): creates `TASK_COMMENTED` notifications
  for relevant recipients and emits a `comment:created` event to the
  project's real-time room — both only after the `Comment` row has
  actually committed.

## List

`GET /?page=&limit=` — any project member.

**Ordered chronologically, oldest first** (`createdAt` ascending, `id` as a
deterministic tiebreaker) — the one list in this project that doesn't
order newest-first, because a conversation reads top-to-bottom, not
most-recent-first. Paginated the same way as every other list in this
project (`page` default `1`, `limit` default `20`, max `50`), `count()`
and `findMany()` run concurrently.

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "...", "taskId": "...", "content": "...",
        "author": { "id": "...", "name": "...", "username": "...", "avatarUrl": null },
        "createdAt": "...", "updatedAt": "..."
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 3, "totalPages": 1 }
  }
}
```

## Detail / isolation

`GET /:commentId` verifies the comment belongs to the specific task named
in the URL — `getCommentWithinTask(taskId, commentId)` mirrors
`getTaskWithinBoard`/`getBoardWithinProject` exactly: a comment requested
through a different task (even a sibling task in the same project), or
through an entirely different project, produces the identical `404
COMMENT_NOT_FOUND` a genuinely nonexistent comment would. This check is
used by every read/write below the detail route too, not only `GET`, so
`PATCH`/`DELETE` can't reach a comment through the wrong task's URL either.

## Update — author-only

`PATCH /:commentId`

```json
{ "content": "This task needs the API docs updated — done, see PR #42." }
```

Only the comment's own `author` may edit it:

```js
if (comment.authorId !== callerId) {
  throw new AppError('You do not have permission to perform this action', 403, 'INSUFFICIENT_PROJECT_ROLE')
}
```

**`OWNER`/`ADMIN` do not automatically gain edit access** — this is a
deliberate exception to this project's usual pattern (elevated roles
manage projects, members, boards, and can delete any comment for
moderation), verified directly during testing: an `ADMIN` and, separately,
an `OWNER`, were both rejected with `403` attempting to edit a `MEMBER`'s
comment. Editing someone else's words isn't a management action this
collaboration model grants to any role — it stays with whoever wrote it.

`content` is the only editable field; empty body → `400`, empty content →
`400`, unsupported field → `400`. On success, emits `comment:updated`.

## Delete — author or moderator

`DELETE /:commentId`

```js
const isAuthor = comment.authorId === callerId
const isModerator = callerRole === 'OWNER' || callerRole === 'ADMIN'
if (!isAuthor && !isModerator) {
  throw new AppError(..., 403, 'INSUFFICIENT_PROJECT_ROLE')
}
```

Unlike editing, deletion **is** a moderation action: the author may remove
their own comment, and `OWNER`/`ADMIN` may remove *any* comment in their
project. An ordinary `MEMBER` may not delete someone else's. Verified
directly: a plain member rejected `403` deleting another member's comment,
while both `OWNER` and `ADMIN` succeeded at the same operation.

**Only the `Comment` row is ever removed.** The `User`
(author), the `Task` it belonged to, and the author's `ProjectMember` row
are all untouched — confirmed directly after every deletion during
testing. On success, emits `comment:deleted`.

## Safe serialization

`toCommentSummary()` (`server/src/utils/comment.js`) is an explicit
allow-list, never a spread of the raw Prisma row:

```js
{
  id, taskId, content,
  author: { id, name, username, avatarUrl },   // never email, never passwordHash
  createdAt, updatedAt,
}
```

The nested `author` object uses the same public-facing shape as every
other "who did this" field in this project (board task-assignees, project
members) — `id`/`name`/`username`/`avatarUrl` only.

## Notifications generated

A `TASK_COMMENTED` notification is created for every task assignee, plus
the task's creator, minus the comment's own author (nobody needs telling
about their own comment) — deduplicated via a `Set`, since the creator
might also be an assignee:

```js
const recipients = new Set(assignees.map((a) => a.userId))
recipients.add(task.createdById)
recipients.delete(authorId)
```

Message wording matches `prisma/seed.js`'s own generated `TASK_COMMENTED`
notifications exactly (`New comment on "<task title>".`), so generated and
seeded data read identically. See [NOTIFICATIONS.md](./NOTIFICATIONS.md)
for the full notification system.

## Validation

`comment.validator.js` follows the whitelist discipline established since
Phase 5:

| Field | Create | Update | Rule |
|---|---|---|---|
| `content` | required | required (only field accepted) | non-empty after trim, ≤4000 characters |

Any other field is `400` on both create and update; an empty update body
is `400`.

## Error handling

| Status | Meaning | Example |
|---|---|---|
| `400` | Invalid input | Empty/missing/oversized content, unsupported field |
| `401` | Not authenticated | No/invalid JWT |
| `403` | Authenticated, not authorized | Non-member; non-author editing; non-author/non-moderator deleting |
| `404` | Not found / wrong hierarchy | Nonexistent project/board/task/comment; comment from a different task |

No stack traces, no Prisma internals, no database details in any response.

## Security considerations

- **`authorId` can never be spoofed** — it's `req.user.id`, never accepted
  from the request body (rejected as an unsupported field if attempted).
- **A comment can never be reached through the wrong task, board, or
  project** — the same `404`-for-wrong-parent discipline as boards, tasks,
  and assignees.
- **Editing is strictly author-only; no role bypasses it.** Deletion's
  moderator exception is deliberate and narrow (delete only, never edit).
- **Logging:** the request logger records method/path/status/duration
  only. Nothing in this module logs a password, a JWT, a connection
  string, or a request body (including comment content).

### What was verified

Every scenario below was exercised against a running server backed by the
real PostgreSQL container, using four accounts (owner, admin, member,
outsider) across two boards in one project and a second, independent
project:

- **Auth:** unauthenticated create → `401`.
- **Create:** owner/admin/member all succeed (`201`); non-member `403`;
  missing content `400`; empty (whitespace-only) content `400`;
  unsupported field (`authorId` spoof attempt) `400`.
- **List:** chronological (oldest-first) order confirmed matching creation
  order; non-member `403`.
- **Detail:** correct hierarchy `200`; **comment requested through a
  sibling task (same project)** `404`; **comment requested through an
  entirely different project** `404`; nonexistent comment `404`.
- **Update:** author (owner, on their own comment) succeeds `200`; **admin
  rejected `403` editing a member's comment**; **owner rejected `403`
  editing a member's comment** (using a different account than the
  author); empty body `400`; unsupported field `400`; empty content `400`.
- **Delete:** a plain member rejected `403` deleting another member's
  comment; non-member `403`; owner (moderator, not author) succeeds
  deleting a member's comment; admin succeeds deleting their own comment;
  `User`/`Task`/`ProjectMember` all confirmed intact afterward; deleting an
  already-gone comment `404`.
- **Notification generation:** the task's creator received exactly one
  `TASK_COMMENTED` notification per comment from someone else, and
  received none for their own comment.
- Server log inspected directly: no password, password hash, JWT, or
  `DATABASE_URL`/`JWT_SECRET` value, or comment content, appeared anywhere
  in it.
- Direct SQL confirmed zero orphaned `comments` rows.
- Seed re-run twice: identical counts both times (including the 120
  pre-existing seeded comments), confirming this phase's changes don't
  affect seed idempotency.
- Full regression of Phase 3 through 9 confirmed unaffected.

## Current limitations

- **No comment editing history / "edited" indicator surfaced by the API**
  — `updatedAt` changes on edit (the schema already supports detecting
  this), but no dedicated flag or diff is returned.
- **No @mentions or rich text** — `content` is a plain text field.
- **No pagination cursor beyond page/limit** — consistent with every other
  list in this project, not a comment-specific gap.
