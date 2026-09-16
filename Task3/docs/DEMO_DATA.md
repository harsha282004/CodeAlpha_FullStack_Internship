# TaskFlow — Demo Dataset (Phase 18)

This document covers `server/prisma/seed-demo.js` — a small, curated,
presentation-ready dataset, distinct from the larger **development seed**
(`server/prisma/seed.js`, 15 users / 4 projects, documented in the main
[README.md](../README.md#seed-data-development-only)) that's been used for
day-to-day local development and manual testing since Phase 2.

**Both seeds are real database seed data — real users, real password
hashes, real Prisma rows — created through the same models and (for
notifications) the same service functions the live application uses.
Nothing here is frontend-only or fabricated.**

## Why a second, separate script

The development seed is intentionally large and utilitarian (15 users,
generic task titles, enough volume to exercise pagination). The demo
dataset is intentionally small and readable — six named people, four
recognizable projects, task titles a reviewer can understand at a glance —
suited to walking someone through the app rather than stress-testing it.

Both can exist in the same database at once. Every id in `seed-demo.js`
uses its own deterministic pattern (`makeDemoId`, filled with `1111...`)
that can never collide with `seed.js`'s pattern (filled with `0000...`),
so seeding one never overwrites or duplicates rows from the other. Neither
script ever runs `prisma migrate reset` or any other destructive
operation — both only ever `upsert` (or, for notifications, check-before-
create) their own fixed set of rows.

## Fictional users

All six identities are fictional demonstration people — not real
individuals, and not affiliated with any real organization.

| Name | Username | Email | Bio |
|---|---|---|---|
| Alex Morgan | `alex_morgan` | alex.morgan@example.com | Product lead for the website relaunch |
| Priya Sharma | `priya_sharma` | priya.sharma@example.com | Mobile engineer and project owner |
| Daniel Wilson | `daniel_wilson` | daniel.wilson@example.com | Backend developer |
| Sara Thomas | `sara_thomas` | sara.thomas@example.com | Marketing lead |
| Marcus Lee | `marcus_lee` | marcus.lee@example.com | Frontend developer |
| Nina Patel | `nina_patel` | nina.patel@example.com | QA and campus events coordinator |

**Demo password (every demo account):**

```
Demo1234!
```

**DEVELOPMENT/DEMO ONLY.** This is a fixed, published, non-secret value —
deliberately different from the development seed's own password
(`Passw0rd!`) so the two datasets are never confused with one another. It
is hashed with the same `bcryptjs` utility (`server/src/utils/password.js`,
cost 12 in the app itself — this seed uses cost 10 for faster seeding, the
same trade-off `seed.js` already makes) the real registration endpoint
uses — never stored or compared in plain text. Never reuse this password
anywhere real.

## Projects

| Project | Owner | Admin | Members |
|---|---|---|---|
| TaskFlow Website | Alex Morgan | Priya Sharma | Daniel Wilson, Sara Thomas |
| Mobile App Development | Priya Sharma | Marcus Lee | Alex Morgan, Nina Patel |
| Marketing Campaign | Sara Thomas | Nina Patel | Daniel Wilson |
| Campus Event Platform | Daniel Wilson | Alex Morgan | Marcus Lee, Priya Sharma |

Every project has exactly one `OWNER` (enforced the same way the live
`POST /api/projects` endpoint enforces it — see
[PROJECTS.md](./PROJECTS.md)), one `ADMIN`, and the rest `MEMBER`. No user
is a member of a project twice — `projectMember.upsert` on the composite
`(projectId, userId)` key makes a duplicate structurally impossible even
across repeated runs. Every user belongs to at least one project.

## Boards

Each project gets the same five boards, in this fixed order:

```
Backlog → To Do → In Progress → Review → Done
```

(Recall a Board *is* this app's Kanban column — see
[TASKS.md](./TASKS.md) and [FRONTEND.md](./FRONTEND.md) — there is no
separate "status" field.) Positions are the boards' array index, so the
order above is exactly what the UI renders, deterministically, every time
this script runs.

## Tasks

Six tasks per project (24 total), cycling through a small pool of
realistic titles so the same recognizable tasks appear with different
descriptions/priorities/due dates across projects:

- "Design landing page"
- "Implement authentication"
- "Create API documentation"
- "Fix mobile navigation"
- "Write integration tests"
- "Prepare release notes"
- "Set up CI pipeline"
- "Review pull requests"

Every task uses a real `TaskPriority` value (`LOW`/`MEDIUM`/`HIGH`/
`URGENT`, cycling deterministically) and a real board position — nothing
invented beyond the schema's own enum.

## Assignments

Each task is assigned to exactly one of its own project's real members
(cycling deterministically through that project's member list) — never a
user from a different project, and never a duplicate `(taskId, userId)`
pair (the same composite-key guarantee the live `POST .../assignees`
endpoint relies on — see [ASSIGNMENTS.md](./ASSIGNMENTS.md)).

## Comments

Two comments per task (48 total), drawn from a small pool of realistic,
non-spammy remarks:

- "API contract is ready for review."
- "I've completed the initial implementation."
- "Can we verify this on mobile as well?"
- "Looks good — merging after CI passes."
- "Left a few notes inline, nothing blocking."

## Notifications — generated honestly, through the real service

Per Phase 18.8, this script does **not** insert `Notification` rows
directly. It imports and calls the exact same
`createNotification()` function every real mutation in the running app
calls (`server/src/services/notification.service.js`) — for every
non-self `PROJECT_MEMBER_ADDED`, `TASK_ASSIGNED`, and `TASK_COMMENTED`
case the membership/assignment/comment data above produces, with the
identical self-action exclusions the live app enforces (nobody is
notified about their own membership addition, their own assignment, or
their own comment). This is a deliberately stronger honesty guarantee
than the development seed's own notifications, which compute the same
shape by hand rather than calling the service.

Because `createNotification()` always assigns a fresh id (there's no
fixed-id upsert on a live service function), idempotency here works by a
semantic check instead: before creating one, the script looks for an
existing notification with the same `(userId, type, projectId, taskId)`
combination and skips it if found. Verified directly: running
`db:seed:demo` twice in a row created 47 notifications on the first run
and **zero** additional notifications on the second.

**Read/unread mix:** after generation, every third notification (by a
stable id ordering) is marked read via a direct, idempotent update — so a
demo of the notification bell shows a realistic mix, not an unrealistic
"everything unread" or "everything read" extreme.

## Activity — deliberately not written here

The pre-existing development seed (`seed.js`) inserts `Activity` rows
directly, as illustrative project-timeline data. **This demo script does
not write any Activity rows.** No controller or service anywhere in the
live application creates an `Activity` row through a real user action (see
[ARCHITECTURE.md](./ARCHITECTURE.md#23-data-flow)) — fabricating a richer
activity history here than the application itself actually produces would
misrepresent what the product does, which Phase 18's own instructions
explicitly warn against. If a future phase adds real activity-generating
code paths, this script should switch to calling those, the same way it
already does for notifications.

## How to seed

```bash
cd server
npm run db:seed:demo
```

Requires the same `DATABASE_URL` as the rest of local development (see
[README.md](../README.md#3-environment-variables)) — this script reads
`server/.env` exactly like `npm run db:seed` does; it does not target the
isolated test database used by `npm test`.

## Expected counts (per run, steady-state)

| Table | Count |
|---|---|
| Users (demo) | 6 |
| Projects | 4 |
| Project memberships | 15 |
| Boards | 20 (4 projects × 5) |
| Tasks | 24 (4 projects × 6) |
| Task assignees | 24 |
| Comments | 48 (24 tasks × 2) |
| Notifications | 47 (created once; 0 more on repeat runs) |

Verified directly, twice in a row, against the real development database:
the first run reported `created this run: 47`; the second reported
`created this run: 0` with every other count identical — confirming the
script is idempotent, not merely "usually safe to re-run."

## Safety

- Never runs `prisma migrate reset` or any other destructive/global
  operation.
- Never deletes or modifies a row it didn't create itself (every write is
  an `upsert` keyed to this script's own deterministic ids, or a
  check-before-create for notifications).
- Coexists with the pre-existing development seed and any manually
  created accounts in the same database without collision — verified
  directly: running both `npm run db:seed` and `npm run db:seed:demo`
  back-to-back left both datasets' row counts unchanged from running
  either alone.
