# TaskFlow — Frontend (Phases 13-15)

This document covers the React/TanStack Start client: its architecture,
routing, state management, real-time integration, and the deliberate
trade-offs made where the backend's actual shape constrains what the UI can
do. For the API surface itself, see [ARCHITECTURE.md](./ARCHITECTURE.md)
and the per-module docs ([PROJECTS.md](./PROJECTS.md) equivalents,
[TASKS.md](./TASKS.md), [ASSIGNMENTS.md](./ASSIGNMENTS.md),
[COMMENTS.md](./COMMENTS.md), [NOTIFICATIONS.md](./NOTIFICATIONS.md),
[REALTIME.md](./REALTIME.md)).

**Scope.** This covers Phase 13 (foundation: API client, auth, routing,
layout, design system), Phase 14 (every page and feature backed by a real
endpoint), and Phase 15 (responsive/accessibility/polish). Every screen
reads and writes through the real Express API introduced in Phases 3-12 —
nothing here is mocked, and no feature exists in the UI that the backend
doesn't actually support.

## Stack

React 19, TypeScript, TanStack Start/Router (file-based routing, SSR),
Vite, Tailwind CSS v4. `socket.io-client` was added as the one new
dependency (server-side `socket.io` already existed from Phase 12); no UI
component framework was introduced — every control in `components/ui/` is
a small, hand-written Tailwind component.

## File layout

```
client/src/
├── lib/
│   ├── api/            — typed REST client (client.ts + one file per resource)
│   └── format.ts        — timeAgo/formatDate/notificationTypeLabel
├── auth/
│   ├── tokenStorage.ts   — localStorage wrapper, isolated behind one module
│   └── AuthContext.tsx    — login/register/logout/session-restore
├── realtime/
│   └── SocketContext.tsx  — Socket.IO connection, rooms, useSocketEvent hook
├── hooks/                 — data-fetching + mutation hooks (one per resource area)
├── components/
│   ├── ui/                — Button, FormField, Modal, ConfirmDialog, Feedback, ToastContext…
│   ├── layout/             — AppShell, Sidebar, Header, NotificationBell
│   ├── projects/           — ProjectCard, CreateProjectModal, MemberPanel
│   ├── tasks/               — KanbanBoard, BoardColumn, TaskCard, TaskDetailModal…
│   └── comments/             — CommentThread
└── routes/                    — file-based routes (see Routing below)
```

## API layer (Phase 13.1)

`lib/api/client.ts` is the one place every REST call goes through:
attaches the bearer token, parses the backend's `{ success, data }` /
`{ success, message, code }` envelope, and normalizes every failure into a
typed `ApiError { status, code, message }` — a component never sees a raw
`fetch` rejection or a backend stack trace. `lib/api/health.ts` is the one
exception: the health endpoints don't use that envelope (see
`server/src/controllers/health.controller.js`), so it talks to `fetch`
directly rather than assuming a shape that isn't there.

Eight resource modules (`auth`, `users`, `projects`, `boards`, `tasks`,
`assignees`, `comments`, `notifications`) each export one typed object
(`authApi`, `usersApi`, …) whose functions map 1:1 to a real backend route
— every path, method, and body shape was read directly from the
corresponding `server/src/routes/*.js` and `*.controller.js`, not guessed.
`lib/api/types.ts` mirrors each `toXSummary()` serializer in
`server/src/utils/*.js` field-for-field.

## Authentication (Phase 13.2-13.3)

`auth/AuthContext.tsx` holds `status` (`loading | authenticated |
unauthenticated`) and the current user. On mount it reads a token from
`auth/tokenStorage.ts` (a thin `localStorage` wrapper — see that file's own
comment for why localStorage rather than a cookie, given this backend
issues a stateless bearer JWT with no session/cookie support to attach to)
and confirms it's still valid via `GET /auth/me` — **the stored token is
only ever a claim until the API confirms it**, never trusted on its own.
An invalid/expired token clears itself and the app falls back to
`unauthenticated`, never a broken or stuck state.

`lib/api/client.ts` calls back into `AuthContext` on any `401` from any
request, anywhere in the app — this is the single path that ends a session
involuntarily (as opposed to the user clicking "Sign out"), and it always
clears the token, resets state, and surfaces a one-time message
(*"Your session has expired. Please sign in again."*) on the next visit to
`/login`. The frontend never generates, decodes, or inspects the JWT
itself — it is an opaque string handed back to the same API that issued
it.

## Protected routing (Phase 13.4)

File-based routes under `routes/_authenticated/` (a **pathless** layout —
the leading `_` adds no URL segment) share one guard,
`routes/_authenticated.tsx`: while `status === 'loading'` it shows a
spinner; once `unauthenticated`, a `useEffect` redirects to `/login`; once
`authenticated`, it renders `AppShell` with the matched child route inside.

This check runs **client-side inside the component**, not in TanStack
Router's `beforeLoad` — deliberately. `beforeLoad` also runs during SSR,
where there is no `localStorage` token to read yet; guarding there would
either crash on the server or wrongly redirect every authenticated visitor
on their very first request. Doing the check in the component means SSR
renders a harmless loading state, and the client takes over once
`AuthContext` has actually confirmed the session.

Route tree:

| Path | File |
|---|---|
| `/`, `/login`, `/register` | public |
| `/app/dashboard` | `_authenticated/app/dashboard.tsx` |
| `/app/projects` | `_authenticated/app/projects/index.tsx` |
| `/app/projects/:projectId` | `_authenticated/app/projects/$projectId/index.tsx` |
| `/app/projects/:projectId/boards/:boardId` | `_authenticated/app/projects/$projectId/boards/$boardId.tsx` |
| `/profile`, `/settings` | `_authenticated/profile.tsx`, `_authenticated/settings.tsx` |

## Layout & design system (Phase 13.5-13.6)

`AppShell` ⊃ `Sidebar` / `Header` / main content, exactly as scoped —
a fixed sidebar on desktop, a slide-over drawer on mobile (opened from the
header's menu button, closed by backdrop click, its own close button, or
navigating). `components/ui/` is the whole design system: `Button`,
`FormField` (labeled inputs/textareas/selects with wired-up
`aria-describedby` errors), `Card`, `Badge`/`RoleBadge`/`PriorityBadge`,
`Avatar` (a real photo or a deterministic initials avatar — never a stock
placeholder), `Modal`/`ConfirmDialog` (focus-trapped, Escape-closing,
focus-restoring), and `Feedback.tsx` (`Spinner`, `Skeleton`, `EmptyState`,
`ErrorState`, `ConnectionDot`). One `global.css` token layer defines the
focus ring, toast animation, and skeleton shimmer used everywhere.

## Kanban — Board is the column (important)

The backend has **no `status` field on Task and no cross-board move
endpoint** — a task's workflow stage is which `Board` it belongs to
(`task.validator.js` explicitly rejects a `status` field with an
explanatory message), and `PATCH .../tasks/:taskId` can change a task's
`position` but never its `boardId` (see [TASKS.md](./TASKS.md) and
[COMMENTS.md](./COMMENTS.md)'s sibling docs). The frontend's Kanban board
(`components/tasks/KanbanBoard.tsx`) reflects this exactly rather than
inventing a `status` concept the backend doesn't have:

- Each **Board is one column**. `hooks/useKanban.ts` fetches every board
  in a project plus each board's own tasks.
- Drag-and-drop (native HTML5 DnD, no added library) **only reorders tasks
  within a single column** — `BoardColumn.tsx`'s drop handler checks the
  dragged task's `boardId` against the column it was dropped on and
  silently ignores a cross-column drop rather than attempting an
  unsupported "move to a different board," which would either be rejected
  by the backend or require inventing a fake success.
- Reordering PATCHes only the tasks whose position actually changed (a
  diff against the pre-drag order), not every task in the column.
- **Known limitation**, stated plainly rather than glossed over: there is
  no UI to move a task to a different board/column. Adding that would
  require a backend endpoint that doesn't exist in this phase (a `boardId`
  field on task update, or a dedicated move route) — out of scope per this
  milestone's "do not build features that do not exist in the backend."
- **Known limitation:** native HTML5 drag-and-drop has no built-in
  keyboard equivalent and does not fire reliably on touch/mobile browsers.
  On mobile, tasks can still be viewed, created, edited, assigned,
  commented on, and deleted — just not reordered by drag. A keyboard- and
  touch-accessible reorder control (e.g. explicit "move up/down" buttons)
  would be a reasonable follow-up but wasn't built here to avoid adding UI
  surface beyond what was asked for.

Task cards show title, description preview, priority (label **and**
icon/color together, never color alone), due date, and assignees.
Assignees have no batch-fetch endpoint, so `useKanban` fetches each
visible task's assignee list concurrently (`Promise.all`, not sequential)
after loading the board — a deliberate, documented trade-off given the
backend's real shape, not an oversight. Comment **count** is not shown on
the card: there is no such field or aggregate endpoint, and fetching every
task's full comment list just to display a number would be wasteful; the
full comment thread is fetched once, on demand, only when a task's detail
view is actually opened.

## Real-time client (Phase 14.15 / realtime behavior)

`realtime/SocketContext.tsx` connects only once `AuthContext` reaches
`authenticated`, using the exact same bearer token as REST (`auth: {
token }` in the Socket.IO handshake — see
[REALTIME.md](./REALTIME.md#authentication--the-existing-jwt-system-not-a-second-one)).
It disconnects on logout and reconnects automatically (Socket.IO's default
backoff) on a dropped connection, rejoining every project room the app was
previously watching. `useSocketEvent(event, handler)` is the one hook
every feature hook subscribes through.

Each domain hook (`useKanban`, `useProject`, `useComments`,
`useNotifications`) applies the project's real-time events to its own
local state **idempotently** — a create is skipped if the id is already
present, a delete is a no-op if already gone, an update just replaces by
id — so the same logical change arriving twice (once from this client's own
REST response, once echoed back over the socket because this client is
also in the room) never produces duplicate cards, duplicate comments, or
duplicate toasts. **Toasts are shown only from the REST mutation call
site that the current user directly triggered, never from a realtime
handler** — this is *how* Phase 15.7's "no duplicate toast for one
REST+socket action" requirement is actually satisfied, not by comparing
actor ids (none of the event payloads carry one, by the backend's own
"safe payload" design).

Connection state is surfaced as a small `ConnectionDot` in the header —
informational only. Every screen's data still comes from its initial REST
fetch; realtime only patches that state going forward. If the socket is
disconnected, the UI stays fully usable (create/edit/delete still work
over REST, they just won't broadcast to *other* open sessions until
reconnected) — realtime is additive, never a dependency for correctness.

## Notifications (Phase 14.13)

The header bell (`components/layout/NotificationBell.tsx`) and
`hooks/useNotifications.ts` are shared by nothing else in this phase (no
separate `/notifications` page was built — the dropdown's list is the
whole feature, matching the milestone's own listed scope). Every
notification's `type` maps to a short, human label
(`lib/format.ts`'s `notificationTypeLabel`) using only the five
`NotificationType` values the backend actually defines — never an invented
category. The notification's own backend-composed `message` (e.g. `"Fix
login bug" was assigned to you.`) is always shown as the primary text; the
label is a secondary category tag.

## Profile / Settings (Phase 14.14)

`/profile` is a read view — public-facing fields (name, username, bio,
avatar) shown separately from a distinct "Account" card (email, member
since) — and `/settings` is the only place those four fields (`name`,
`username`, `bio`, `avatarUrl` — exactly `profile.validator.js`'s
`UPDATABLE_FIELDS`) can be edited. Email, password, id, role, and every
timestamp are not exposed as editable anywhere, because the backend has no
endpoint for changing them in this phase.

## State management approach

No global store or data-fetching library was introduced. Every feature
area has one hook (`useProjects`, `useProject`, `useKanban`, `useComments`,
`useNotifications`) that owns its own `useState` + a `load()` fetch +
mutation functions that update that same state from the REST response —
plain React, no Redux/Zustand/React Query. This was a deliberate choice
given the app's actual size: one global cache would be solving a
consistency problem this app doesn't yet have, at the cost of a dependency
and an abstraction a reviewer would have to learn. Reconciliation with
realtime events is handled the same explicit way (see above), not through
a cache-invalidation library.

## Responsive design (Phase 15.1)

Checked at 1440×900, 1280×800, 1024×768, 768×1024, 390×844, and 375×812.
The sidebar collapses to a slide-over drawer under Tailwind's `lg`
breakpoint; the Kanban board is a horizontally-scrolling flex row of
fixed-width columns (`overflow-x-auto`, each column `shrink-0`), so columns
never wrap awkwardly or overflow the page — the *board* scrolls
horizontally by design, the page itself never does. Every modal is
`max-w-{sm,md,lg}` with viewport padding and its own internal scroll
(`max-h-[90vh] overflow-y-auto`), so a long form never gets clipped off a
short mobile screen. Grids (dashboard stats, project cards) collapse to a
single column below `sm`.

## Accessibility (Phase 15.2)

- Every form control is a real `<label htmlFor>`/`<input id>` pair
  (`components/ui/FormField.tsx`), with `aria-invalid`/`aria-describedby`
  wired to its error text — never a placeholder standing in for a label.
- `Modal`/`ConfirmDialog` are `role="dialog"` + `aria-modal`, trap Tab/
  Shift+Tab inside themselves, close on `Escape`, and restore focus to
  whatever triggered them on close.
- Every icon-only button (menu, close, notification bell, delete comment,
  rename/delete board) has an `aria-label`.
- Priority and role are always shown as a label *and* an icon/color
  together (`PriorityBadge`), never color alone — see Phase 15.3 below.
- Focus is visible everywhere via one consistent `:focus-visible` ring
  (`global.css`) rather than the browser default or, worse, `outline:
  none`.
- Toast messages are announced via `aria-live="polite"`.
- **Known gap:** the Kanban drag-and-drop reorder interaction itself has
  no keyboard equivalent (see the Kanban section above) — every other
  interaction in the app (including opening, editing, and deleting a task)
  is fully keyboard-operable.

## Priority & status visuals (Phase 15.3-15.4)

`PriorityBadge` pairs a color with a distinct icon and the priority's own
text label (○ LOW, ◐ MEDIUM, ▲ HIGH, ⚠ URGENT) — four real backend
`TaskPriority` values, nothing invented. "Status" is the column (Board)
itself; there is no separate status badge to design, since inventing one
would contradict the backend's own model (see the Kanban section above).

## Micro-interactions, forms, toasts, confirmations (Phase 15.5-15.8)

Hover/focus states on every interactive element, a single CSS-only toast
entrance transition (`global.css`'s `.toast-enter`, respects
`prefers-reduced-motion`), disabled+spinner button states during
submission, and inline field errors. `ToastProvider` de-duplicates by an
optional `key` so the same logical action never double-toasts (used by
every `useKanban`/`useProject` mutation). Every destructive action (delete
project/board/task, remove member, delete comment) goes through the same
`ConfirmDialog`, which states plainly what will be removed.

## Navigation (Phase 15.9)

Sidebar highlights the active section; the board-detail page shows a
"← back to project" link; there is no dead-end screen — every error and
empty state offers a next action (retry, create, or a link back).

## Data consistency (Phase 15.10)

Every mutation updates local state from its own REST response immediately
(the user never waits on a socket echo to see their own change), and
realtime events reconcile the same state idempotently for changes made
elsewhere — see the Real-time client section above. A dropped/reconnected
socket rejoins its rooms automatically; nothing depends on a lost event
being retried, since the next REST fetch (a manual refresh, or opening a
screen fresh) always re-reads the authoritative database state.

## Security

- No JWT secret, `DATABASE_URL`, or any backend credential exists anywhere
  in client code or a `VITE_*` variable — the only configurable value is
  `VITE_API_URL` (the API's own public base URL, defaulting to
  `http://localhost:5002/api`).
- The access token is never logged, and never rendered in the UI (not even
  in a debug panel).
- Role-based UI (hiding an "Edit"/"Delete" button from a `MEMBER`) is
  presentation only — every one of those actions still requires the
  backend's own `requireProjectRole` check, verified directly (a `MEMBER`
  calling a restricted endpoint via a raw request, bypassing the UI
  entirely, still gets `403` — see the REGRESSION section of the phase
  report).
- `passwordHash` is never part of any type this frontend defines or any
  response it reads (the backend's own serializers never return it either
  — see `server/src/utils/user.js`).

## Performance

- No full-page reloads for any in-app action; every navigation is a
  client-side route transition.
- Realtime patches local state directly instead of refetching after every
  event.
- The one deliberately-accepted N-request pattern (per-task assignee
  fetch on board load, run concurrently) is documented above rather than
  hidden, since no batch endpoint exists to avoid it.
- `useNotifications`/`useProject`/`useKanban` each fetch once per mount and
  update in place afterward — no polling anywhere in the app.

## What isn't here

- No E2E/browser test run is included in this phase's verification — see
  the milestone's TESTING section in the final report for exactly what
  *was* verified (a live Node-driven integration script against the real
  API + Socket.IO, plus manual SSR response checks) and why a full
  browser-driven run wasn't performed.
- No deployment or hosting configuration was added or changed.
