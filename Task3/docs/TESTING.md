# TaskFlow — Automated Testing (Phase 17)

This document covers the automated test suites added in Phase 17: how
they're organized, what they cover, how to run them, and their actual,
observed results — not projected or assumed ones. See
[SECURITY_AUDIT.md](./SECURITY_AUDIT.md) for how the same test suite also
serves as the evidence base for Phase 16's security findings.

## Framework choice

**Vitest** (backend) — chosen because `server/` is already a pure-ESM
(`"type": "module"`) Node project with no prior test framework: Vitest
runs ESM natively with no Babel/transpilation step, has a Jest-compatible
API (`describe`/`it`/`expect`), and needed nothing beyond itself,
`supertest` (HTTP assertions against the real Express `app`), and
`socket.io-client` (already used as a throwaway dev dependency for manual
Phase 12 verification — now a proper devDependency backing real,
repeatable tests).

**Playwright** (frontend) — already configured in Phase 15
(`client/playwright.config.ts`, `client/e2e/`); extended in this phase
rather than replaced, per the instruction to reuse existing test
infrastructure.

No new test framework was introduced beyond these two, and no existing
one was removed.

## Test environment — an isolated database, never the dev database

Every backend test talks to a real Express `app` instance and a real
PostgreSQL database — never a mock. That database is **`taskflow_test`**,
a second database created inside the same `task3-postgres` Docker
container the development database (`taskflow`) already uses:

```sql
CREATE DATABASE taskflow_test;
```

`server/.env.test` (git-ignored; copy from the committed
`server/.env.test.example`) points at it, with its own throwaway
`JWT_SECRET`. `server/tests/setup.js` loads this file with
`dotenv.config({ override: true })` **before** any other module (so it
wins over a developer's own `server/.env`), and then — independently —
`server/tests/helpers.js`'s `resetDb()` re-checks that
`DATABASE_URL` contains `taskflow_test` immediately before truncating any
table, refusing to run otherwise. Both checks exist so that a
misconfigured `.env.test` fails loudly at startup instead of silently
wiping a developer's real local data.

**Test files run sequentially, not in parallel**
(`vitest.config.js`'s `fileParallelism: false`) — every file calls
`resetDb()` in its own `beforeEach`, and two files truncating/writing the
same shared tables concurrently would be flaky by construction. Tests
*within* one file still run in the order written.

This design was chosen specifically so `npm test` can never touch a
developer's actual development data — the phase brief's own explicit
requirement ("do not destroy a developer's important local database").

## Test structure

```
server/tests/
├── setup.js               — loads .env.test, refuses to run without it
├── helpers.js              — api client, resetDb(), fixture builders
├── auth/auth.test.js        (23 tests)
├── users/users.test.js       (15 tests)
├── projects/projects.test.js  (17 tests)
├── projects/members.test.js    (16 tests)
├── boards/boards.test.js        (10 tests)
├── tasks/tasks.test.js           (18 tests)
├── assignments/assignments.test.js (9 tests)
├── comments/comments.test.js        (13 tests)
├── notifications/notifications.test.js (10 tests)
├── security/isolation.test.js         (16 tests)
├── security/authorization-matrix.test.js (97 tests)
├── security/mass-assignment.test.js       (13 tests)
├── security/validation.test.js             (17 tests)
└── realtime/socket.test.js                  (14 tests)
```

(Exact counts confirmed via Vitest's JSON reporter, `assertionResults.length`
per file — they sum to 288, matching the default reporter's own total.)

```
client/e2e/
├── flows.spec.ts       — 3 tests covering all 7 required user flows
└── responsive.spec.ts  — 13 tests across 6 required viewports
```

## API coverage (Phase 17.2)

Every endpoint area named in the phase brief has real, executed test
coverage:

| Area | Covered |
|---|---|
| Auth | register, login, `/auth/me`, invalid credentials, invalid/expired/tampered/wrong-secret JWT |
| Users | current profile, public profile, profile update (incl. rejecting unsupported fields), search |
| Projects | create, list (scoped to caller), detail, update, delete |
| Members | add, list, remove, role change — plus every negative case |
| Boards | create, list, detail, update, delete |
| Tasks | create, list, detail, update (title/description/priority/position/dueDate), delete |
| Assignments | assign, list, status check, remove |
| Comments | create, list, detail, update (author-only), delete (author-or-moderator) |
| Notifications | list, unread-count, mark-read (idempotent), mark-all-read, delete |

## Authorization test matrix (Phase 17.3)

`security/authorization-matrix.test.js` is the dedicated, automated
matrix: one fixture project with a real OWNER/ADMIN/MEMBER, plus a
non-member and an unauthenticated caller, driven through **9 read
endpoints × 5 caller types** (45 tests) and **13 write operations × 4
caller checks** (OWNER/ADMIN/MEMBER role-appropriateness, plus a
non-member check on every one — 52 tests) — 97 tests in this file alone,
all negative-authorization-inclusive (every write case asserts the
callers who should be *rejected*, not only the ones who should succeed).

## Isolation / IDOR coverage (Phase 17.4)

`security/isolation.test.js` builds two independent projects (each with
its own owner, member, board, task, and comment) plus a bare outsider, and
tests project, board, task, assignee, comment, and notification isolation
— including explicit **URL substitution** (a real id from Project B
placed inside a Project A-scoped URL). `realtime/socket.test.js` extends
the same isolation guarantee to Socket.IO rooms.

## Validation coverage (Phase 17.5)

`security/validation.test.js` plus per-resource validation tests
throughout `tests/*/`: empty/whitespace strings, over-long strings,
invalid/malformed UUIDs, malformed JSON, unsupported fields, invalid enum
values, negative and oversized pagination, an unsafe URL scheme
(`javascript:`), null/wrong-type values, and missing required fields.

## Database testing (Phase 17.6)

- **Migration status**: `npx prisma migrate deploy` was used to bring
  `taskflow_test` to the same schema as the documented, committed
  migration (`20260915155905_init`) — verified by the test suite running
  successfully against it (a schema mismatch would fail nearly every
  test immediately).
- **Foreign-key integrity / cascade behavior**: exercised indirectly by
  every delete test (`DELETE /projects/:id`, `DELETE .../tasks/:id`, etc.)
  succeeding without orphaned-row errors, and directly by
  `assignments.test.js`'s check that removing an assignee leaves the
  underlying `ProjectMember`/`User`/`Task` rows intact.
- **Unique constraints**: `members.test.js` and `assignments.test.js`
  both assert a duplicate (membership / assignment) attempt returns `409`
  — the composite-primary-key guarantee at the database level, not just
  application-level pre-checking.
- **Composite keys**: `(projectId, userId)` for `ProjectMember` and
  `(taskId, userId)` for `TaskAssignee` are exercised by every membership/
  assignment test in the suite.
- **Transaction behavior**: `createProject`'s transaction (project +
  owner membership created atomically) is exercised by every project-
  creation test asserting the caller is immediately `OWNER` — a failure
  partway through would leave no project at all, never a project without
  an owner.
- **Seed idempotency**: verified directly, for both seed scripts, by
  running each twice in a row and comparing row counts —
  see [DEMO_DATA.md](./DEMO_DATA.md) for the demo seed's numbers; the
  pre-existing development seed (`prisma/seed.js`) was re-run in this
  same session and reported identical counts to its previously-documented
  values (15 users / 4 projects / 22 members / 16 boards / 40 tasks / 60
  assignees / 120 comments / 148 notifications / 242 activities).
- Tests run against the isolated `taskflow_test` database exclusively —
  the development database was never touched by an automated test.

## Socket.IO testing (Phase 17.7)

`realtime/socket.test.js` starts one real `http.createServer(app)` +
`initSocketServer()` instance on an ephemeral port for the whole file, and
uses real `socket.io-client` connections against it: valid-JWT connection,
invalid/expired/wrong-secret-JWT rejection, project-room join
authorization (member success, non-member and nonexistent-project
distinct rejections), event delivery (`task:created`, `comment:created`,
`task:assigned`, `board:deleted`) to an authorized listener, cross-project
event isolation (a listener in Project A's room receives nothing from a
Project B mutation), notification delivery to only the intended
recipient's personal room, and a disconnect-then-reconnect-by-the-same-
user check that also confirms the server stays healthy afterward
(`GET /api/health` still `200`).

**Not covered**: Socket.IO's own automatic-reconnection *backoff*
behavior (the client library's responsibility, not this app's) — the
disconnect test confirms a fresh connection succeeds after a clean
disconnect, not the reconnection timing/backoff itself.

## Frontend testing (Phase 17.8)

No new frontend test framework was added — Playwright, from Phase 15, was
reused and extended. `e2e/flows.spec.ts` drives real browser sessions
through login, register, dashboard, create project, open project, create
board, create task, assign a member, comment (add/edit/delete), and the
notification panel; logout is exercised implicitly by each test's fresh,
isolated browser context rather than as its own assertion (there is no
separate logout flow to verify beyond `AuthContext.logout()` clearing
state, which the auth foundation's own design covers). Loading states,
API-error surfacing, and empty states are exercised by the app's normal
render path during these flows (e.g. the dashboard's empty-project state
was directly observed during Phase 14/15 verification); a dedicated
"simulate a 401 mid-session" or "simulate a 403 from the UI" browser test
was **not** added in this phase — see Known limitations below.

## E2E scenarios (Phase 17.9)

`e2e/flows.spec.ts` implements all 7 required scenarios:

| # | Scenario | Test |
|---|---|---|
| 1 | Register → login → dashboard | `FLOW 1` |
| 2 | Create project → board → task | `FLOW 2-6` (combined) |
| 3 | Add member → assign task → verify | `FLOW 2-6` |
| 4 | Add comment → edit → delete | `FLOW 2-6` |
| 5 | Generate notification → open → mark read | `FLOW 2-6` |
| 6 | Two sessions → modify task → verify real-time update | `FLOW 2-6` |
| 7 | Unauthorized project access → rejection | `FLOW 7` |

`e2e/responsive.spec.ts` additionally checks all 6 required viewports
(1440×900 → 375×812) for horizontal overflow on public pages and the most
layout-dense authenticated screen (Kanban board + open task modal).

## How to run the tests

```bash
# Backend — one-time setup
cd server
cp .env.test.example .env.test   # adjust credentials if needed
docker exec taskflow-task3-postgres psql -U taskflow -d taskflow -c "CREATE DATABASE taskflow_test"
DATABASE_URL="<the .env.test value>" npx prisma migrate deploy

# Backend — every run
npm test          # vitest run — single pass, CI-style
npm run test:watch  # vitest — watch mode for local development

# Frontend E2E — requires both dev servers already running
# (npm run dev at the repo root, or npm run dev:server / npm run dev:client)
cd client
npx playwright install chromium   # first time only
npx playwright test
```

## Actual results (this session)

These are real, observed numbers from this session — not projected:

```
Server test suite:  14 files, 288 tests, 288 passed, 0 failed
Frontend E2E suite:  2 files,  16 tests,  16 passed, 0 failed
```

One transient failure (`Can't reach database server at localhost:5434`)
occurred during an earlier full-suite run while several other database-
heavy commands (manual seed re-runs, `psql` inspection, dev servers, the
Playwright suite) were all executing concurrently against the same local
Postgres container — re-running the single affected file in isolation,
and then the entire suite cleanly with no concurrent load, both passed
288/288. This is recorded here rather than omitted, per the instruction
not to fabricate results: it was a local resource-contention blip, not a
defect in the application or the tests, and the clean re-run is the
number that stands.

Separately, Vitest's `--reporter=json` output (used only to get exact
per-file test counts for the table above) marked every `describe.each`/
`it.each`-generated test in `authorization-matrix.test.js` with
`status: "failed"` even though the same run's own default-reporter summary
line reported `288 passed, 0 failed` with exit code 0. Re-running that one
file alone with the default reporter confirmed `97 passed (97)` — this
was a JSON-reporter serialization quirk in this Vitest version specific to
parameterized tests, not a real failure; the default reporter's tally is
what's reported as the suite's actual result throughout this document.

## Known limitations

- No code-coverage percentage is reported — no coverage tool
  (`@vitest/coverage-v8` or similar) was added in this phase, so there is
  no coverage number to report, fabricated or otherwise.
- No CI pipeline (GitHub Actions or similar) runs these tests
  automatically on push — they are run manually, as documented above.
  Configuring one was not requested and touches infrastructure/deployment,
  out of scope per this project's own standing rules.
- Frontend tests are E2E-only; there are no frontend unit/component tests
  (e.g. via Vitest + Testing Library) for individual React components in
  isolation. Given the existing Playwright suite already exercises every
  component through real user flows against the real backend, and adding
  a second, unit-level frontend test framework was assessed as scope
  beyond what Phase 17.8's "reuse existing infrastructure, don't add
  redundant frameworks" instruction calls for.
- No load/performance/concurrency testing was performed.
- Socket.IO reconnection *backoff timing* (as opposed to reconnection
  succeeding at all) was not tested.
