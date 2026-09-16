# TaskFlow — Real-Time Updates (Phase 12)

This document covers the Socket.IO layer: how connections authenticate,
how project rooms are authorized, and what events get emitted when. For
the events' underlying triggers, see [TASKS.md](./TASKS.md),
[ASSIGNMENTS.md](./ASSIGNMENTS.md), [COMMENTS.md](./COMMENTS.md), and
[NOTIFICATIONS.md](./NOTIFICATIONS.md). For the general system layout, see
[ARCHITECTURE.md](./ARCHITECTURE.md#16-socketio-architecture).

**Scope: server-side Socket.IO only.** This phase adds a Socket.IO server
alongside the existing Express REST API and wires event emission into the
mutating service functions that already exist. **It does not add a
frontend Socket.IO client, a frontend real-time UI, or any frontend
integration whatsoever** — the client app in this repo does not connect to
any of this yet. Everything in this document describes server behavior
only, verified with a standalone Node test harness (not part of the
project's own dependency tree — see
[What was verified](#what-was-verified) below), not with the actual React
client.

## Why this doesn't replace the REST API

Every mutation in this project still goes through its normal REST
endpoint, still gets validated the same way, and still writes to
PostgreSQL through Prisma exactly as before. Socket.IO adds a *second*,
one-way channel — server-to-client push — that fires **after** a REST
mutation's database write has already committed. Nothing here allows a
client to mutate data over a socket; there is no equivalent of `POST`
via Socket.IO. **The database remains the single source of truth**;
sockets exist purely to tell already-connected clients that it changed,
without them having to poll.

## Server setup

The only structural change to the HTTP layer, in `server/src/server.js`:

```js
const httpServer = http.createServer(app)
initSocketServer(httpServer)
httpServer.listen(env.port, ...)
```

`app.listen(...)` (implicitly wrapping its own internal `http.Server`)
becomes an explicit `http.createServer(app)` handed to both
`httpServer.listen(...)` and `new Server(httpServer)` — Socket.IO attaches
its own request listener for paths under `/socket.io/` and is a complete
no-op for every other path, so Express's own routing, middleware, and CORS
are entirely unaffected. This was verified empirically, not just assumed:
the full Phase 3–9 regression suite was re-run against the Socket.IO-
enabled server and passed unchanged (see
[REGRESSION](#what-was-verified) below).

`socket.io` was already listed in `server/package.json` since the Phase 1
scaffolding — it had simply never been used until now. No new server
dependency was added. (`socket.io-client`, needed only to write a test
harness, was installed in an isolated scratchpad directory with its own
throwaway `package.json`, confirmed via `git diff --stat` to have made
zero changes to any project `package.json`/lock file.)

## Authentication — the existing JWT system, not a second one

`server/src/realtime/socket.js`'s `authenticateSocket` runs as a Socket.IO
middleware on every connection attempt, before any event handler runs:

```js
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token
  if (!token) return next(new Error('Authentication required'))
  try {
    const payload = verifyAccessToken(token)   // same jsonwebtoken util as requireAuth
    socket.userId = payload.userId
    next()
  } catch {
    next(new Error('Invalid or expired token'))
  }
})
```

This is the identical `verifyAccessToken()` helper `requireAuth` uses for
REST — there is no second JWT secret, no second signing/verification path,
and no way to connect without a token that was actually issued by this
server's own login/register endpoints. `socket.userId` is set **only**
from the verified token's payload — a client cannot claim to be a
different user by sending a different id anywhere in the handshake; no
handshake field other than the token itself is ever trusted for identity.

On successful auth, the socket is auto-joined to `user:<userId>` — the
room [NOTIFICATIONS.md](./NOTIFICATIONS.md)'s `notification:new` /
`notification:read` events are delivered through — using the server-
verified `userId`, never a client-supplied one.

## Project rooms — `project:<projectId>`

Unlike the user room, project rooms are **opt-in**: a connected socket
must explicitly request to join one (`socket.emit('project:join',
{ projectId })`) and is authorized in four steps, mirroring the REST
`requireProjectMember` middleware's own logic exactly rather than
reimplementing a parallel version of it:

1. Socket already authenticated (`authenticateSocket` above; otherwise the
   connection itself was already rejected).
2. **Verify the project exists** — `prisma.project.findUnique(...)`. If
   not, respond with a distinct `"Project not found"` error.
3. **Verify the authenticated user is a member** — `prisma.projectMember
   .findFirst({ where: { projectId, userId: socket.userId } })`, using
   `socket.userId` (server-verified at connection time), never anything
   the client sends in the join request. If not a member, respond with a
   distinct `"You are not a member of this project"` error.
4. Only if both checks pass: `socket.join(`project:${projectId}`)`.

Both rejection messages are deliberately distinct (not collapsed into one
generic "not authorized") because the REST equivalent already makes this
same distinction, and a client debugging "why can't I join this room"
needs to know which of the two is actually true. This distinction was
specifically tested for and initially missing in an early implementation
pass — the first version returned the same generic message for both
"project doesn't exist" and "not a member," which was caught during
testing and corrected to check project existence explicitly before
falling back to the not-a-member message.

`socket:leave` (`project:leave`) is symmetric — `socket.leave(...)`, no
re-verification needed since leaving a room is never a privilege
escalation.

## Event catalogue

All events are emitted via two small helpers in
`server/src/realtime/socket.js`:

```js
emitToProject(projectId, event, payload)   // io.to(`project:${projectId}`).emit(event, payload)
emitToUser(userId, event, payload)         // io.to(`user:${userId}`).emit(event, payload)
```

| Event | Emitted by | Delivered to | Payload |
|---|---|---|---|
| `project:member_added` | `membership.service.js` | project room | `{ projectId, member: { id, name, username, avatarUrl, role } }` |
| `board:created` | `board.service.js` | project room | `{ projectId, board: toBoardSummary(...) }` |
| `board:updated` | `board.service.js` | project room | `{ projectId, board: toBoardSummary(...) }` |
| `board:deleted` | `board.service.js` | project room | `{ projectId, boardId }` |
| `task:created` | `task.service.js` | project room | `{ projectId, task: toTaskSummary(...) }` |
| `task:updated` | `task.service.js` | project room | `{ projectId, task: toTaskSummary(...) }` (content fields changed) |
| `task:moved` | `task.service.js` | project room | `{ projectId, task: toTaskSummary(...) }` (position/board changed) |
| `task:deleted` | `task.service.js` | project room | `{ projectId, boardId, taskId }` |
| `task:assigned` | `assignment.service.js` | project room | `{ projectId, taskId, assignee: toAssigneeSummary(...) }` |
| `task:unassigned` | `assignment.service.js` | project room | `{ projectId, taskId, userId }` |
| `comment:created` | `comment.service.js` | project room | `{ projectId, taskId, comment: toCommentSummary(...) }` |
| `comment:updated` | `comment.service.js` | project room | `{ projectId, taskId, comment: toCommentSummary(...) }` |
| `comment:deleted` | `comment.service.js` | project room | `{ projectId, taskId, commentId }` |
| `notification:new` | `notification.service.js` | the recipient's own `user:<userId>` room | `toNotificationSummary(...)` |
| `notification:read` | `notification.service.js` | the recipient's own `user:<userId>` room | `{ notificationId }` or `{ all: true }` (for mark-all) |

Naming convention: `<domain>:<action>`, past tense for things that already
happened (this is a notification channel, not a command channel) — no
event is named as an imperative, since nothing here asks a client to do
anything.

## Payload principles

- **Every payload reuses the same safe serializer its REST counterpart
  already uses** (`toTaskSummary`, `toBoardSummary`, `toCommentSummary`,
  `toAssigneeSummary`, `toNotificationSummary`) — never a raw Prisma row,
  never the entire changed record, never `passwordHash`, a JWT, or any
  environment secret.
- **Delete events send only identifiers** (`{ projectId, boardId,
  taskId }`, etc.) — there's nothing else meaningful left to serialize
  once a row is gone, and doing so keeps every payload shape minimal and
  consistent (identify what changed; let the client already hold or
  refetch the rest).
- **One mutation → one logical event per changed aspect** — a combined
  task update that changes both content fields and position emits *both*
  `task:updated` and `task:moved` once each (matching the analogous
  notification-generation split in
  [NOTIFICATIONS.md](./NOTIFICATIONS.md#real-change-vs-no-op)), never a
  single event repeated, and never one event fired twice for one change.

## Emission timing — always after commit, never in a catch

Every `emitTo*` call in every service happens **after** its Prisma write
has already resolved successfully — structurally, the emit line is always
below the `await prisma.<model>.create/update/delete(...)` line that
produced it, never inside a `try`'s `catch` branch and never speculatively
before the write. Two direct consequences, both verified:

- **A failed mutation never produces a misleading event.** A duplicate-
  assignment attempt that fails with `409` produces zero `task:assigned`
  events — confirmed by listening for the event and observing nothing
  arrive.
- **A real-time event never arrives before its REST response even could**
  — since the emit is the very next synchronous step after the awaited
  write, no ordering-dependent race exists between "REST caller sees
  `201`" and "room listeners see the event."

## CORS — a separate mechanism from REST, sharing one value

Socket.IO's CORS is configured independently of Express's own CORS
middleware (`cors()` in `app.js`) — they are two different libraries with
two different configuration surfaces — but both are pointed at the exact
same `env.clientUrl` value (the same `CLIENT_URL` environment variable
introduced in earlier phases), never `"*"`:

```js
new Server(httpServer, {
  cors: { origin: env.clientUrl, credentials: true },
})
```

An unrecognized origin cannot open a Socket.IO connection any more than it
could complete a REST request from a browser.

## Graceful shutdown — Socket.IO closes first

`server.js`'s shutdown sequence (guarded by the pre-existing
`isShuttingDown` flag against double-invocation) now closes resources in
this order:

```
io.close()  →  httpServer.close()  →  prisma.$disconnect()  →  process.exit()
```

Socket.IO is closed **first**, before the HTTP server stops accepting new
connections and before Prisma disconnects — so no socket is left
half-open trying to reach a database connection that's already gone, and
no in-flight REST request is cut off mid-response by the database
disconnecting before the HTTP server itself has stopped. The pre-existing
timeout-based force-exit and `SIGINT`/`SIGTERM` handlers from Phase 3 are
unchanged.

## Error handling — never crashes the process

- **Missing/invalid/expired/malformed/wrong-secret token:** connection
  rejected via `next(new Error(...))` in the auth middleware — the socket
  never completes its handshake; no exception escapes to the process
  level.
- **Room-join against a nonexistent or foreign project:** handled inside
  `handleProjectJoin`'s own try/catch, responding with an error event to
  that socket only — never thrown uncaught.
- **Client disconnect (clean or network drop):** Socket.IO's own
  `disconnect` handling reclaims room membership automatically; nothing
  in this project's code needs to react to it manually since no
  server-side state (beyond room membership) is tied to a live socket.

## Security considerations

- **No second authentication system** — one JWT verification function,
  shared by REST `requireAuth` and the socket handshake middleware, using
  the same secret and the same token format issued at login.
- **No client-supplied identity is ever trusted** — `socket.userId` comes
  only from the verified token payload; `projectId` in a join request is
  checked against real `Project`/`ProjectMember` rows in PostgreSQL before
  any room join, exactly like the REST hierarchy checks.
- **Room isolation:** a socket only receives project-room events for
  projects it explicitly joined and was authorized for; a socket that
  never joined `project:B`'s room receives nothing from it, even while
  connected and receiving events from `project:A`.
- **No secret values in any payload** — verified by inspecting every
  emitted payload directly during testing; none contain `passwordHash`,
  a JWT, `DATABASE_URL`, or `JWT_SECRET`.

### What was verified

Using a standalone Node test harness (`socket.io-client`, installed only
in an isolated scratchpad location — never added to this project's own
`package.json`/lock file) against the running server, backed by the real
PostgreSQL container:

- **Connection auth:** no token → rejected; invalid/malformed token →
  rejected; expired token → rejected; well-formed token signed with the
  wrong secret → rejected; valid token → connects successfully and is
  auto-joined to `user:<userId>`.
- **Room authorization:** a project member successfully joins
  `project:<id>`; a non-member is rejected with the distinct
  `"You are not a member of this project"` message; a nonexistent project
  id is rejected with the distinct `"Project not found"` message (this
  distinction was specifically added and re-verified after being caught
  missing in an earlier pass — see [Project rooms](#project-rooms--projectprojectid)
  above).
- **Event delivery:** a client joined to `project:A`'s room received
  `task:created`/`task:updated`/`task:moved`/`task:deleted`,
  `board:created`/`updated`/`deleted`, `task:assigned`/`unassigned`,
  `comment:created`/`updated`/`deleted`, and `project:member_added` when
  the corresponding REST mutation was performed by a *different* connected
  client — confirmed the payload shape for each matched the table above
  and contained no unsafe fields.
- **Cross-project isolation:** a client joined only to `project:A` did
  **not** receive any event triggered by a mutation in `project:B`,
  confirmed by listening on both projects' events simultaneously from two
  separate sockets and correlating which arrived where.
- **Notification delivery isolation:** `notification:new` arrived only on
  the intended recipient's own `user:<userId>` room — a second connected
  client (different user) listening for the same event received nothing
  from another user's triggered notification.
- **No-op suppression:** re-sending an unchanged task field produced no
  `task:updated`/`task:moved` event (matching
  [NOTIFICATIONS.md](./NOTIFICATIONS.md#real-change-vs-no-op)'s
  notification-suppression behavior exactly, since both draw on the same
  diff check).
- **Failed mutation → no event:** a duplicate-assignment attempt
  (rejected `409` over REST) produced no `task:assigned` event.
- **REST regression:** the full Phase 3–9 REST test suite was re-run
  against the Socket.IO-enabled server and passed unchanged, confirming
  Express routing/CORS/error-handling were unaffected by the `http.Server`
  restructuring.
- **Graceful shutdown:** triggered `SIGINT` against the running server
  with an active socket connection; confirmed in logs that Socket.IO
  closed before the HTTP server stopped accepting connections and before
  Prisma disconnected, and that the process exited cleanly (no hang, no
  forced-timeout path taken).
- Server log inspected directly across every scenario above: no password,
  password hash, JWT, or environment secret value appeared anywhere in
  it.

## Current limitations

- **No frontend Socket.IO client integration** — the React client in this
  repo does not connect to any of this yet; this phase is server-only, as
  scoped.
- **No presence/typing-indicator features** — connection and room
  membership exist solely to scope event delivery, not to show "who's
  online."
- **No message acknowledgement/delivery-receipt system** — events are
  fire-and-forget from the server's side; a disconnected client simply
  misses events until it reconnects and refetches over REST (REST remains
  authoritative, as stated throughout this document).
- **No horizontal-scaling adapter (e.g. Redis)** — this implementation
  assumes a single Node process; multi-instance deployment would need a
  Socket.IO adapter, which is out of scope for this phase and this
  project's current deployment model.
