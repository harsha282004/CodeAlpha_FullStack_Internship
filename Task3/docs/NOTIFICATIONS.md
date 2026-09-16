# TaskFlow — Notifications (Phase 11)

This document covers the `Notification` model: user-scoped alerts
generated from real events elsewhere in the system. For where this fits
architecturally, see
[ARCHITECTURE.md](./ARCHITECTURE.md#15-notification-architecture). For the
events that generate notifications, see [TASKS.md](./TASKS.md),
[ASSIGNMENTS.md](./ASSIGNMENTS.md), and [COMMENTS.md](./COMMENTS.md). For
real-time delivery of the same events, see [REALTIME.md](./REALTIME.md).

**Scope: notifications only.** This phase implements listing, counting,
reading, and deleting a user's own notifications, plus the generation
logic triggered by other modules' mutations. It does **not** implement a
frontend notification dropdown/bell/toast — nothing here implies a
frontend consumes this API yet.

## File layout

```
server/src/
├── controllers/notification.controller.js
├── routes/notification.routes.js         — mounted at top level, not nested
├── services/notification.service.js      — reusable primitives, called from other services
├── validators/notification.validator.js
└── utils/notification.js                 — toNotificationSummary()
```

## Database

**No schema change.** The Phase 2 schema already had both the model and
every `NotificationType` this phase generates:

```prisma
model Notification {
  id        String           @id @default(uuid()) @db.Uuid
  userId    String           @map("user_id") @db.Uuid
  type      NotificationType
  message   String
  projectId String?          @map("project_id") @db.Uuid
  taskId    String?          @map("task_id") @db.Uuid
  read      Boolean          @default(false)
  createdAt DateTime         @default(now()) @map("created_at")
}

enum NotificationType {
  TASK_ASSIGNED
  TASK_COMMENTED
  TASK_UPDATED
  TASK_MOVED
  PROJECT_MEMBER_ADDED
}
```

This phase generates every one of these five types from real events —
none were added, none are unused. Confirmed via `prisma migrate status`
before and after implementation — "Database schema is up to date!" both
times.

## `notification.service.js` — deliberately "dumb"

Every notification-creating code path in this project (assignment,
comment, task update/move, membership) calls into this one service rather
than writing `prisma.notification.create(...)` itself:

```js
createNotification({ userId, type, message, projectId, taskId })
createNotifications([{ userId, type, message, projectId, taskId }, ...])
getUserNotifications(userId, { page, limit })
getUnreadCount(userId)
markAsRead(userId, notificationId)
markAllAsRead(userId)
deleteNotification(userId, notificationId)
```

It holds **no business logic about *when* to notify** — no self-action
checks, no "was this a no-op" checks, no recipient-gathering. Those
decisions live in the calling service (`assignment.service.js`,
`comment.service.js`, `task.service.js`, `membership.service.js`) because
only the caller knows the domain context (who's the actor, who else is
involved, whether anything actually changed). `notification.service.js`'s
job is strictly: persist rows correctly, read them back scoped to the
right user, and emit the corresponding real-time event — nothing else.
This split was a deliberate design choice, made so notification-generation
rules could be reasoned about (and tested) one trigger at a time, in the
module that owns that trigger, rather than as a single monolithic
dispatcher trying to know about every event type in the system.

## Routes

Mounted at `/api/notifications` — **not** nested under `/projects/:id`
like almost every other resource in this project, because a notification
belongs to a user, not to a project (a single `GET /api/notifications`
call spans every project the user is in). Every route requires
`Authorization: Bearer <token>`; there is no project-role gate because
there's no project role in play — only "is this row mine."

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/unread-count` | Count of this user's unread notifications |
| `GET` | `/?page=&limit=` | List this user's notifications, newest first |
| `PATCH` | `/read-all` | Mark all of this user's notifications read |
| `PATCH` | `/:notificationId/read` | Mark one notification read |
| `DELETE` | `/:notificationId` | Delete one notification |

`/read-all` is registered **before** `/:notificationId/read` in
`notification.routes.js` so Express's router doesn't try to match
`read-all` as a `:notificationId` path segment.

## Ownership — the only authorization rule that matters here

Every read/write is scoped to `req.user.id` at the query level, not
filtered after the fact:

```js
// getOwnNotificationOrThrow(userId, notificationId)
const notification = await prisma.notification.findFirst({
  where: { id: notificationId, userId },
})
if (!notification) {
  throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND')
}
```

A notification that exists but belongs to someone else produces the exact
same `404` a nonexistent notification would — **never a `403`**, and never
any hint (via status code or message) that the row exists at all. This is
the same not-found-vs-forbidden convention already used for
cross-project/board/task access everywhere else in this project, applied
here to the one resource where "wrong owner" is the *only* possible
authorization failure (there's no room/board/task hierarchy to also get
wrong).

## Unread count

`GET /unread-count` runs a single `prisma.notification.count({ where: {
userId, read: false } })` — one query, no loading the full notification
list into memory to count it in JavaScript.

```json
{ "success": true, "data": { "count": 3 } }
```

## List

`GET /?page=&limit=` — newest first (`createdAt` descending, the opposite
ordering from comments, matching every other list in this project),
paginated the standard way (`page` default `1`, `limit` default `20`, max
`50`, `count()`/`findMany()` concurrent).

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "...", "type": "TASK_ASSIGNED",
        "message": "You were assigned to \"Fix login bug\".",
        "projectId": "...", "taskId": "...",
        "read": false, "createdAt": "..."
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 12, "totalPages": 1 }
  }
}
```

## Mark as read — idempotent

`PATCH /:notificationId/read` sets `read: true`. Calling it a second time
on an already-read notification is a no-op success (`200`, still `read:
true`), not an error — read status only ever moves forward, and a client
retrying a request it's unsure succeeded should never see a failure for
something that already happened. Verified directly: the same call issued
twice in a row returned `200` both times with identical output.

`PATCH /read-all` sets `read: true` on every one of the caller's currently
unread notifications in a single `updateMany`, then re-emits
`notification:read` — also safe to call with zero unread notifications
(`200`, no-op).

## Delete

`DELETE /:notificationId` — only the `Notification` row is removed; the
event it was about (the `Task`, `Comment`, `Project`, etc.) is completely
unaffected. Deleting an already-deleted or someone-else's notification is
`404`.

## Notifications generated — the five triggers

| Type | Trigger | Recipients | Self-action excluded? |
|---|---|---|---|
| `TASK_ASSIGNED` | `assignment.service.js`'s `addAssignee` | the newly assigned user | yes — assigning yourself generates none |
| `TASK_COMMENTED` | `comment.service.js`'s `createComment` | task assignees + task creator | yes — comment author excluded |
| `TASK_UPDATED` | `task.service.js`'s `updateTask`, when title/description/priority/dueDate genuinely changed | task assignees | yes — the actor who made the edit is excluded |
| `TASK_MOVED` | `task.service.js`'s `updateTask`, when `position`/`boardId` genuinely changed | task assignees | yes — the actor who moved it is excluded |
| `PROJECT_MEMBER_ADDED` | `membership.service.js`'s `addMember`, only after the row actually commits | the newly added member | n/a (an admin/owner adds someone else; there's no self-add path) |

Every trigger above fires **only after** its underlying mutation has
actually succeeded — never speculatively, never from inside a `catch`
block. If the assignment/comment/update/membership write fails (e.g. a
duplicate-assignment `409`), no notification is created for it. This
project doesn't wrap these in an explicit `$transaction`, because Prisma's
own composite-key uniqueness constraints (already the concurrency
guarantee elsewhere in this project) mean the write either fully succeeds
or throws before any notification code runs — there's no partial-success
state to reconcile.

### Real change vs. no-op

`TASK_UPDATED`/`TASK_MOVED` are **not** generated just because a `PATCH`
request was sent — only when a value genuinely differs from what was
already stored, via a small `valuesDiffer` helper (Date-aware, so
re-sending an identical ISO due-date string doesn't look like a change):

```js
function valuesDiffer(a, b) {
  if (a instanceof Date || b instanceof Date) {
    return new Date(a).getTime() !== new Date(b).getTime()
  }
  return a !== b
}
```

Verified directly: re-sending a task's current `position` value produced
`200` (the request still succeeds) but created **no** `TASK_MOVED`
notification and emitted no `task:moved` real-time event — only the
fields that actually changed trigger anything.

### Message wording

Every generated message matches `prisma/seed.js`'s own pre-seeded
notification text exactly, so a user can't tell generated notifications
from seeded ones by tone:

- `TASK_ASSIGNED`: `You were assigned to "<task title>".`
- `TASK_COMMENTED`: `New comment on "<task title>".`
- `TASK_UPDATED`: `"<task title>" was updated.`
- `TASK_MOVED`: `"<task title>" was moved.`
- `PROJECT_MEMBER_ADDED`: `You were added to "<project name>".`

## Safe serialization

`toNotificationSummary()` (`server/src/utils/notification.js`):

```js
{ id, type, message, projectId, taskId, read, createdAt }
```

No `userId` field in the response — the caller already knows it's their
own list; echoing it back adds nothing and there's no scenario in this
API where a notification response ever describes someone else's row.

## Validation

`validateListNotificationsQuery(query)` — `page`/`limit` only, same rules
as every other paginated list (`limit` default `20`, max `50`).

## Error handling

| Status | Meaning | Example |
|---|---|---|
| `400` | Invalid query | Non-numeric `page`/`limit` |
| `401` | Not authenticated | No/invalid JWT |
| `404` | Not found / not owned | Nonexistent notification, or one belonging to another user |

There is no `403` in this module — see [Ownership](#ownership--the-only-authorization-rule-that-matters-here)
above for why.

## Security considerations

- **Every query is scoped to `req.user.id` in the `WHERE` clause itself**
  — never fetched broadly and filtered in application code, and never
  distinguishable (by status code or message) from "doesn't exist" when
  it belongs to someone else.
- **No notification ever contains another user's private data** — the
  safe serializer only ever exposes `projectId`/`taskId` (already-scoped
  identifiers the recipient has legitimate access to, since they're a
  participant in the underlying event) and a pre-composed message string,
  never a raw copy of the underlying `Task`/`Comment`/`Project` record.
- **Real-time delivery reuses the same per-user room** — see
  [REALTIME.md](./REALTIME.md)'s `user:<userId>` room, joined
  automatically on socket connection using the JWT's own `userId`, never
  a client-supplied value.

### What was verified

Exercised against a running server with the real PostgreSQL container,
using multiple accounts across two independent projects:

- **Auth:** unauthenticated request to every route → `401`.
- **Ownership isolation:** user A's notification requested (read or
  delete) by user B → `404` (not `403`, not visible in any way); confirmed
  for both `PATCH .../read` and `DELETE`.
- **Unread count:** matched a direct `count()` against the same
  `WHERE` clause the endpoint uses; confirmed it changes correctly after
  `mark as read` and `mark all as read`.
- **Mark as read idempotency:** same notification marked read twice in a
  row → `200` both times, no error on the second call.
- **Mark all as read:** run with a mix of read/unread notifications →
  only previously-unread rows changed; run again immediately after (zero
  unread remaining) → `200`, no-op, no error.
- **Generation — `TASK_ASSIGNED`:** assigning another user creates one
  notification for them; **assigning yourself creates none**.
- **Generation — `TASK_COMMENTED`:** commenting notifies assignees +
  creator, excluding the commenter; commenting on your own sole-assigned
  task (assignee = creator = commenter) generates none (all recipients
  excluded).
- **Generation — `TASK_UPDATED`/`TASK_MOVED`:** changing `title` created
  exactly one `TASK_UPDATED` per assignee (excluding the actor); **moving**
  a task (`position` change) created `TASK_MOVED` instead; **re-sending an
  identical value created neither** (verified via direct row count before
  and after); a combined update (both content and position changed in one
  request) correctly generated both notification types from a single
  request.
- **Generation — `PROJECT_MEMBER_ADDED`:** adding a member creates exactly
  one notification for them, with the project's actual name interpolated.
- **Failure doesn't notify:** attempting a duplicate assignment (`409`)
  confirmed via row count that no `TASK_ASSIGNED` notification was created
  for the failed attempt.
- Direct SQL confirmed zero orphaned `notifications` rows (every
  `userId`/`projectId`/`taskId` reference intact) and no duplicate
  notifications for a single logical event.
- Server log inspected directly: no notification message, user id, or any
  secret value logged beyond the standard method/path/status/duration
  line.
- Seed re-run twice: identical notification counts both times.
- Full regression of Phase 3 through 10 confirmed unaffected.

## Current limitations

- **No push/email delivery** — in-app rows plus the real-time event only
  (see [REALTIME.md](./REALTIME.md)); no offline delivery channel.
- **No per-type notification preferences** — a user can't opt out of one
  `NotificationType` while keeping others.
- **No frontend consumes this API yet** — no bell icon, dropdown, or
  toast exists in the client in this phase.
