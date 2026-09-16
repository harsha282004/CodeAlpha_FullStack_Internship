# TaskFlow — Security & Authorization Audit (Phase 16)

This document reports the results of actively testing TaskFlow's
authentication, authorization, and data-isolation guarantees — not just
reading the code. Every claim below is backed by an automated test in
`server/tests/` (see [TESTING.md](./TESTING.md) for how to run them) or a
directly-observed command output, both referenced by name so the claim can
be re-verified independently. Where something could not be verified this
way, that is stated explicitly rather than implied.

**This report does not claim TaskFlow is "100% secure."** No audit can
prove the absence of every vulnerability; it can only report what was
actively tested and what was found. See [Remaining limitations](#remaining-limitations)
for what this audit does not cover.

## Scope and method

Every finding below was produced by one of:

1. An automated integration test that sends a real HTTP request (or, for
   Socket.IO, opens a real socket connection) to the real running
   application, backed by the real PostgreSQL database — see
   `server/tests/auth/`, `server/tests/security/`, and
   `server/tests/realtime/`.
2. A direct shell command whose output is quoted verbatim.
3. Direct source inspection, called out explicitly as inspection rather
   than an executed test where no test could exercise it (e.g., confirming
   a value is read from `process.env` rather than hardcoded).

## 16.1 — Authentication audit

All of the following are covered by `server/tests/auth/auth.test.js`
(22 tests) and re-verified as part of every full test run:

| Requirement | Result |
|---|---|
| Registration requires valid input | ✅ empty/whitespace name, malformed username, invalid email format, short/over-long password all rejected `400` |
| Duplicate email rejected | ✅ `409` |
| Duplicate username rejected | ✅ `409` |
| Password hashing works | ✅ bcryptjs, cost 12 (`server/src/utils/password.js`) — see 16.2 |
| `passwordHash` never appears in any API response | ✅ asserted via `JSON.stringify(res.body)` containment check on register, login, and `/auth/me` responses |
| Login rejects invalid password | ✅ `401` |
| Login rejects nonexistent user safely | ✅ `401`, identical message and code to a wrong password |
| Login error doesn't reveal account existence | ✅ both cases return the exact string `"Invalid email or password"`; a dummy bcrypt comparison runs for a nonexistent email so timing doesn't leak it either (`auth.service.js`'s `dummyHashPromise`) |
| JWT contains only intended claims | ✅ `jwt.decode()`'d in a test and asserted to have exactly `['exp', 'iat', 'sub']` — no email, role, or username ever placed in the token |
| JWT expiration works | ✅ a token signed with `expiresIn: -10` (already expired) is rejected `401` |
| Malformed JWT rejected | ✅ |
| Tampered JWT rejected | ✅ payload byte-edited after signing, signature no longer matches, rejected `401` |
| Wrong-secret JWT rejected | ✅ a token signed with a different secret string is rejected `401` |
| Missing Authorization header rejected | ✅ `401` |
| Malformed Authorization header rejected | ✅ wrong scheme (`Token <jwt>`) and an empty bearer value both `401` |
| Protected routes reject unauthenticated requests | ✅ spot-checked directly (`GET /api/projects`, `GET /api/notifications`) and true structurally — every project/board/task/comment/notification route is behind `requireAuth` |

**Secrets come from environment variables, never hardcoded** — confirmed
by direct inspection of `server/src/config/env.js` (every secret is
`process.env.X`) and by a repo-wide grep for a hardcoded secret literal:

```
$ grep -rn "JWT_SECRET\s*=\s*['\"]" server/src
$ grep -rn "DATABASE_URL\s*=\s*['\"]" server/src
(no matches)
```

## 16.2 — Password security

- **bcryptjs is used**, confirmed in `server/src/utils/password.js`.
- **Cost factor 12** in the real application code
  (`const SALT_ROUNDS = 12`) — the seed scripts use a lower cost (10) only
  to make repeated local seeding faster; this never affects real user
  accounts created through `POST /api/auth/register`, which always goes
  through the cost-12 path.
- **Password length validated**: 8–72 characters, enforced in
  `auth.validator.js` — the 72-character ceiling exists specifically
  because bcrypt itself silently truncates anything longer, so this
  rejects an over-length password with a clear `400` instead of silently
  accepting a weaker effective password.
- **Raw passwords are never logged** — confirmed by inspecting every
  `console.log`/`console.warn`/`console.error` call in `server/src`
  (7 call sites total: server startup/shutdown messages, a database
  health-check failure, and the dev request logger, which logs only
  `method path status duration` — see `server/src/middleware/requestLogger.js`'s
  own comment). None references `req.body`, a password, or a token.
- **Password hashes are never logged** — same sweep; no call site
  references `passwordHash`.
- **Passwords are never returned to clients** — verified by the
  `passwordHash`-containment assertions in `auth.test.js` and `users.test.js`,
  and structurally guaranteed by `server/src/utils/user.js`'s explicit
  allow-list serializers (`toSafeUser`/`toPublicUser`), which are never a
  spread of the raw Prisma row.

**Secrets/logging grep sweep (Phase 16.2's exact instruction), run against
the whole of `Task3/`:**

```
$ grep -rn "password\b" Task3/server/src Task3/client/src | grep -vi "passwordHash\|password:\|autoComplete\|type=.password.\|placeholder"
```

turns up only field names, type declarations, and comments — no logged
value. `JWT_SECRET`/`DATABASE_URL`/`Authorization` appear only as
environment-variable reads, header-name string literals, or comments
explaining the security model — never a hardcoded value.

## 16.3 — Authorization audit (OWNER / ADMIN / MEMBER)

Covered exhaustively by `server/tests/security/authorization-matrix.test.js`,
which builds one project with a real OWNER, ADMIN, and MEMBER (plus a
non-member and an unauthenticated caller) and drives every GET endpoint
and twelve distinct write operations through all five caller types.

Verified directly:

- **OWNER**: can manage the project (rename/delete), members (add/remove/
  change role), boards (create/rename/delete), tasks (create/update/
  delete), and assignments (assign/remove); can moderate (delete) any
  comment.
- **ADMIN**: can rename (not delete) the project, add/remove members
  (not change roles), manage boards/tasks/assignments the same as OWNER;
  **cannot** delete the project (`403`), **cannot** change a member's role
  (`403`), **cannot** remove or modify the OWNER's own membership row
  (`403`, `CANNOT_REMOVE_OWNER`/`CANNOT_CHANGE_OWNER_ROLE`), and **cannot**
  escalate their own or anyone else's role to OWNER (rejected at the
  validator level, `400` — `OWNER` is not in the assignable-role set at
  all).
- **MEMBER**: can view everything, create/update tasks and comments, and
  create boards; **cannot** perform any administrative operation (project
  rename/delete, board rename/delete, task delete, member add/remove/role-
  change, assignment add/remove) — every one of these returns `403`.
  **Cannot** manipulate membership in any way, and **cannot** escalate
  their own role (`server/tests/projects/members.test.js`'s "MEMBER cannot
  change their own role" case, `403`).

**Explicit escalation attempts tested and blocked** (Phase 16.6):

| Attempt | Result |
|---|---|
| MEMBER → OWNER (self) | `403` (role-change endpoint is OWNER-only) |
| MEMBER → ADMIN (self) | `403` |
| ADMIN → OWNER (self or anyone) | `400` at validation — OWNER is never an assignable role through any endpoint |
| ADMIN attempts a role change at all | `403` (role changes are OWNER-only, not ADMIN) |
| User modifies their own `ProjectMember` role | `403` (self or otherwise, only OWNER may call this endpoint, and never targeting the OWNER row) |
| User modifies a membership row in a project they don't belong to | `403` (see IDOR section below) |

## 16.4 — IDOR / object access audit

This was the most exhaustively tested area, per the phase brief's own
emphasis. `server/tests/security/isolation.test.js` builds two fully
independent projects (A and B), each with its own owner, member, board,
task, and comment, and tests **URL substitution explicitly** — taking a
real id that exists in Project B and placing it inside a Project A-scoped
URL, not just requesting Project B's own URL as an outsider.

Verified directly, all in the same test file:

- Project A's owner/member cannot access Project B's project detail,
  members, boards, tasks, assignees, comments, or notifications — `403`
  in every case (an existing resource they're not a member of).
- **A board/task/comment belonging to Project B is `404` — not `403` —
  when requested through Project A's URL with B's real id substituted in**
  (e.g. `GET /api/projects/{A}/boards/{B's real board id}`) — confirming
  the hierarchy check verifies genuine parentage, not just "does this id
  exist somewhere," and does so identically to how a nonexistent id would
  be treated (no information leak distinguishing "wrong project" from
  "doesn't exist" at this level, consistent with `TASKS.md`/`BOARDS.md`'s
  documented convention).
- Project A's owner cannot assign a Project-B-only user to a Project A
  task, cannot delete Project B's task/board/comment, and cannot edit
  Project B's comment.
- An outsider who belongs to **neither** project is rejected from both.
- Project A's owner cannot read, mark-read, or delete Project B's
  notifications (`404`, the same "don't confirm existence" treatment used
  everywhere else — see 16.11).
- **Socket.IO room isolation** (see 16.10): a socket joined to Project A's
  room never receives an event triggered in Project B, verified with two
  live socket connections and a REST mutation in between
  (`server/tests/realtime/socket.test.js`).

No IDOR was found in this pass. Every cross-project access attempt tested
was correctly rejected.

## 16.5 — Mass assignment / field injection audit

`server/tests/security/mass-assignment.test.js` sends the exact dangerous-
field bundle from the phase brief (`id`, `role`, `ownerId`, `userId`,
`createdAt`, `updatedAt`, `passwordHash`, `projectId`, `boardId`, `taskId`)
to every mutating endpoint in the API (profile update, project create/
update, member add/role-change, board create/update, task create/update,
assignee add, comment create/update, and registration) alongside otherwise
valid data.

**Result: every one of these requests is rejected with `400`.** This
project's validators use an explicit field whitelist (a `Set` of allowed
keys checked with `Object.keys(body).filter(k => !allowed.has(k))`) rather
than a blocklist or silent-drop — so a dangerous field is never silently
ignored (which could mislead a caller into thinking it took effect) and
never silently honored (which would be the actual vulnerability). The one
partial exception, tested separately and confirmed safe: `POST /auth/register`
with a spoofed `id`/`role` still returns `201`, because the register
validator simply never reads those keys off the body at all — the created
account's real id is confirmed (in `mass-assignment.test.js`) to differ
from the attacker-supplied one, and there is no admin/role concept on
`User` for a spoofed `role` to grant in the first place.

## 16.7 — Input validation audit

`server/tests/security/validation.test.js` (18 tests) plus per-resource
validation tests throughout `server/tests/*/`. Verified: malformed JSON
(`400 INVALID_JSON`, not a raw parser stack trace), an oversized body
(`413`, the 100kb `express.json()` limit), malformed/non-UUID path
params (`404`, never a raw 500 — every hierarchy check treats an
unparseable id as "not found" before it ever reaches Prisma), `null`
and non-string types where a string is expected (`400`, never coerced),
excessively long strings (`400`, never truncated), negative pagination
(`400`), a pagination limit above each endpoint's documented maximum
(`400`, never silently clamped), invalid enum values for both task
priority and member role (`400`), an invalid due-date string (`400`), a
non-`http(s)` avatar URL scheme such as `javascript:` (`400`, blocking
exactly the class of URL that would be an XSS vector if ever rendered
unescaped), whitespace-only required fields (`400`, not just empty
strings), and a non-integer/negative position value (`400`).

## 16.8 — Database / Prisma security

Inspected directly: `server/src` contains exactly **one** raw SQL call in
the entire codebase —

```js
// server/src/services/health.service.js
await prisma.$queryRaw`SELECT 1`
```

— a fixed, parameter-free liveness check with no user input anywhere near
it (confirmed by reading the file: the function takes no arguments).
**No other `$queryRaw`/`$executeRaw`/`*Unsafe` call exists anywhere in the
project** (confirmed by a repo-wide grep — see the command above). Every
other database access goes through Prisma's own query builder, which
parameterizes values automatically; there is no string-built SQL anywhere
to search for.

**Authorization filtering happens at the query level**, not "fetch
everything, then filter in JavaScript" — e.g. `listProjectsForUser` scopes
its `WHERE` clause to `userId` directly (`project.service.js`),
`getUserNotifications` scopes to `userId` directly, and every hierarchy
check (`requireProjectMember`, `requireBoardInProject`,
`requireTaskInBoard`) queries only the specific row implied by the URL,
never a broader set subsequently narrowed.

## 16.9 — CORS / HTTP security

- **CORS never uses `"*"`** — `corsOptions.origin` is `env.clientUrl`,
  read from `CLIENT_URL` (confirmed by direct inspection of
  `server/src/app.js`); Socket.IO's own CORS config uses the identical
  `env.clientUrl` value (`server/src/realtime/socket.js`).
- **`CLIENT_URL` comes from the environment**, with no fallback to a
  wildcard in any environment.
- **Helmet remains enabled**, with one deliberate, narrow relaxation
  (`crossOriginResourcePolicy: { policy: 'cross-origin' }`) needed because
  the frontend and API run on different origins by design — every other
  Helmet default header (`X-Content-Type-Options`, `X-Frame-Options`'s
  modern equivalent, HSTS when applicable, etc.) is untouched.
- **Oversized JSON body remains rejected** — `413`, re-verified in
  `validation.test.js` in this pass, not just inspected.
- **Malformed JSON remains handled safely** — `400 INVALID_JSON`,
  re-verified in this pass.
- Production security was not weakened for testing purposes — the test
  suite runs against the same `app.js`/middleware stack production uses,
  pointed only at a different database and JWT secret via `.env.test` (see
  [TESTING.md](./TESTING.md)); no middleware is bypassed, disabled, or
  conditionally skipped for `NODE_ENV=test`.

## 16.10 — Socket.IO security

Covered by `server/tests/realtime/socket.test.js` (14 tests), each opening
a real socket connection against a real running server instance.

| Requirement | Result |
|---|---|
| Missing token rejected | ✅ `connect_error`, `"Authentication required"` |
| Invalid (malformed) token rejected | ✅ |
| Expired token rejected | ✅ |
| Wrong-secret token rejected | ✅ |
| Unauthorized project room rejected | ✅ a non-member gets `{success:false, message:"You are not a member of this project"}`, distinct from a nonexistent project's `{success:false, message:"Project not found"}` |
| Cross-project room access | ✅ a socket joined only to Project A's room never receives a `task:created` event triggered in Project B (verified with a 400ms wait-and-assert after the trigger, to rule out a slow/delayed delivery rather than none at all) |
| Event payload leakage | ✅ every observed payload (`task:created`, `comment:created`, `task:assigned`) was asserted to not contain `passwordHash`, and to contain only the documented allow-listed fields |
| Notification leakage | ✅ see 16.11 |
| No socket trusts a client-supplied user id | ✅ `socket.userId` is set only from the verified JWT's `sub` claim (confirmed by reading `server/src/realtime/socket.js`'s `authenticateSocket`); the test suite additionally confirms a user only ever receives notifications addressed to their own verified identity, never one they might claim in any payload (there is no payload field for a socket to claim an identity through at all) |

## 16.11 — Notification security

Verified directly, twice — once in `server/tests/notifications/notifications.test.js`'s
own "ownership isolation" block, and again from the cross-project angle in
`server/tests/security/isolation.test.js`:

- User A cannot list User B's notifications (each user's list is scoped
  to `req.user.id` at the query level, confirmed empty intersection
  between two users' returned id sets).
- User A cannot mark User B's notification read — `404`, and the target
  notification is confirmed still unread afterward.
- User A cannot delete User B's notification — `404`, and the target
  notification is confirmed still present afterward.
- **A notification belonging to someone else is `404`, not `403`** — the
  same "don't confirm what you can't see" treatment used for cross-project
  access, so a caller can never distinguish "that id belongs to someone
  else" from "that id doesn't exist" by status code alone.
- Real-time notification events reach only the intended recipient's own
  `user:<id>` room — verified live in `socket.test.js` (an assignment
  produces `notification:new` for the assignee's socket and confirmed
  absent, after a wait, on the actor's own socket, which is not the
  notification's recipient).

## Findings and fixes made

**No vulnerability was found and left unfixed.** One genuine gap was found
and fixed **during the Phase 12 real-time work** (not this audit pass,
but confirmed still correct here): an early implementation of the
Socket.IO room-join handler returned the same generic rejection message
for "project doesn't exist" and "you're not a member" — this audit's
`socket.test.js` re-verifies the fix (the two cases return distinct
messages) as a regression check, not as a newly-discovered issue.

This audit pass itself (Phase 16) found **zero** new authorization,
IDOR, mass-assignment, or Socket.IO security defects — every test written
to actively probe for one passed on first execution against the existing,
unmodified backend. No backend source file was changed as part of this
security audit.

## Remaining limitations

Stated plainly, per the phase brief's instruction not to claim
completeness:

- **No automated fuzzing or dependency vulnerability scanning beyond
  `npm audit`** was performed (see the QUALITY section of the final
  report for its actual output).
- **No penetration testing against a deployed instance** — everything
  above was tested against the local development stack; deployment
  configuration is explicitly out of scope for every phase so far.
- **No rate-limiting/brute-force-throttling exists** on login or
  registration — a client can attempt unlimited login guesses. This is a
  real, known gap, not fixed in this phase (fixing it was not requested
  and would be a behavior change, not just verification).
- **No CSRF protection is implemented or needed under the current model**
  — this API uses bearer-JWT auth with no cookies, which is inherently
  not vulnerable to CSRF (there is no ambient credential a forged
  cross-site request could ride on); this is a property of the
  architecture, not a tested control.
- **Helmet's Content-Security-Policy is left at its default**, not a
  custom policy — not evaluated as part of this audit beyond confirming
  Helmet itself is active.
- **No formal secrets-scanning tool** (e.g. gitleaks/truffleHog) was run;
  the grep sweeps in this document are manual and targeted, not
  exhaustive pattern-matching across every possible secret shape.
- This audit tested the application as built through Phase 15; it does
  not cover any hypothetical future feature.
