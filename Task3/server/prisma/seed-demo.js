import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { createNotification } from '../src/services/notification.service.js'

const prisma = new PrismaClient()

// ---------------------------------------------------------------------------
// This is the DEMO dataset — a small, curated, presentation-ready set of
// fictional data, distinct from prisma/seed.js's larger DEVELOPMENT seed
// (15 users / 4 projects used for day-to-day local development and the
// Phase 3-15 test scripts). Both can coexist in the same database: every id
// here uses its own deterministic pattern (see makeDemoId below), so this
// script's upserts can never collide with, overwrite, or duplicate
// prisma/seed.js's rows. Run independently via `npm run db:seed:demo`.
//
// DEVELOPMENT/DEMO ONLY — see docs/DEMO_DATA.md. Every identity below is
// fictional; the password is a fixed, published, non-production value.
// ---------------------------------------------------------------------------
const DEMO_PASSWORD = 'Demo1234!'
const SALT_ROUNDS = 10

// Same deterministic-id approach as prisma/seed.js (upsert-by-fixed-id, so
// re-running this script never creates duplicates), but with "1111111"/
// "1111"/"4111"/"8111" filler instead of seed.js's all-zero filler — this is
// what guarantees the two scripts' ids can never collide even though they
// share one database.
function makeDemoId(prefix, n) {
  return `${prefix}1111111-1111-4111-8111-${String(n).padStart(12, '0')}`
}

// ---------------------------------------------------------------------------
// Users (6) — fictional demonstration identities only.
// ---------------------------------------------------------------------------
const USER_SEEDS = [
  ['alex_morgan', 'Alex Morgan', 'Product lead for the website relaunch.'],
  ['priya_sharma', 'Priya Sharma', 'Mobile engineer and project owner.'],
  ['daniel_wilson', 'Daniel Wilson', 'Backend developer.'],
  ['sara_thomas', 'Sara Thomas', 'Marketing lead.'],
  ['marcus_lee', 'Marcus Lee', 'Frontend developer.'],
  ['nina_patel', 'Nina Patel', 'QA and campus events coordinator.'],
]

const USERS = USER_SEEDS.map(([username, name, bio], i) => ({
  id: makeDemoId('a', i + 1),
  name,
  username,
  email: `${username.replace(/_/g, '.')}@example.com`,
  bio,
  avatarUrl: null,
}))

const U = Object.fromEntries(USERS.map((u) => [u.username, u.id]))

// ---------------------------------------------------------------------------
// Projects + membership
// ---------------------------------------------------------------------------
const PROJECT_SEEDS = [
  {
    name: 'TaskFlow Website',
    description: 'Public marketing site for TaskFlow — design, build, and launch.',
    members: [
      ['alex_morgan', 'OWNER'],
      ['priya_sharma', 'ADMIN'],
      ['daniel_wilson', 'MEMBER'],
      ['sara_thomas', 'MEMBER'],
    ],
  },
  {
    name: 'Mobile App Development',
    description: 'Native mobile companion app for TaskFlow.',
    members: [
      ['priya_sharma', 'OWNER'],
      ['marcus_lee', 'ADMIN'],
      ['alex_morgan', 'MEMBER'],
      ['nina_patel', 'MEMBER'],
    ],
  },
  {
    name: 'Marketing Campaign',
    description: 'Launch campaign planning across social, email, and events.',
    members: [
      ['sara_thomas', 'OWNER'],
      ['nina_patel', 'ADMIN'],
      ['daniel_wilson', 'MEMBER'],
    ],
  },
  {
    name: 'Campus Event Platform',
    description: 'A small event-scheduling platform for university clubs.',
    members: [
      ['daniel_wilson', 'OWNER'],
      ['alex_morgan', 'ADMIN'],
      ['marcus_lee', 'MEMBER'],
      ['priya_sharma', 'MEMBER'],
    ],
  },
]

const BOARD_NAMES = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done']

const PROJECTS = PROJECT_SEEDS.map((p, i) => ({
  id: makeDemoId('b', i + 1),
  name: p.name,
  description: p.description,
  ownerId: U[p.members[0][0]],
}))

const PROJECT_MEMBERS = PROJECT_SEEDS.flatMap((p, i) =>
  p.members.map(([username, role]) => ({ projectId: PROJECTS[i].id, userId: U[username], role })),
)

const BOARDS = PROJECT_SEEDS.flatMap((p, i) =>
  BOARD_NAMES.map((name, position) => ({
    id: makeDemoId('c', i * BOARD_NAMES.length + position + 1),
    projectId: PROJECTS[i].id,
    name,
    position,
  })),
)

// ---------------------------------------------------------------------------
// Tasks, assignees, comments
// ---------------------------------------------------------------------------
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

const TASK_POOL = [
  ['Design landing page', 'Create the visual design for the public landing page.'],
  ['Implement authentication', 'Wire up login and registration end to end.'],
  ['Create API documentation', 'Document every endpoint for the team and future integrators.'],
  ['Fix mobile navigation', 'The nav drawer overlaps content on small screens.'],
  ['Write integration tests', 'Cover the main flows for this milestone.'],
  ['Prepare release notes', 'Summarize what shipped for the next release.'],
  ['Set up CI pipeline', 'Automate build and test on every push.'],
  ['Review pull requests', 'Clear the backlog of pending reviews.'],
]

const TASKS_PER_PROJECT = 6

function buildTasksForProject(projectIndex, project, boards, memberUsernames) {
  const tasks = []
  for (let t = 0; t < TASKS_PER_PROJECT; t += 1) {
    const [title, description] = TASK_POOL[(projectIndex * TASKS_PER_PROJECT + t) % TASK_POOL.length]
    const board = boards[t % boards.length]
    const creator = memberUsernames[t % memberUsernames.length]
    tasks.push({
      id: makeDemoId('d', projectIndex * 100 + t + 1),
      projectId: project.id,
      boardId: board.id,
      title,
      description,
      priority: PRIORITIES[t % PRIORITIES.length],
      position: Math.floor(t / boards.length),
      dueDate: t % 2 === 0 ? new Date(Date.UTC(2026, t % 12, 10 + t)) : null,
      createdById: U[creator],
    })
  }
  return tasks
}

const TASKS = PROJECT_SEEDS.flatMap((p, i) => {
  const projectBoards = BOARDS.filter((b) => b.projectId === PROJECTS[i].id)
  const memberUsernames = p.members.map(([username]) => username)
  return buildTasksForProject(i, PROJECTS[i], projectBoards, memberUsernames)
})

const TASK_ASSIGNEES = TASKS.flatMap((task, i) => {
  const project = PROJECT_SEEDS[Math.floor(i / TASKS_PER_PROJECT)]
  const memberUsernames = project.members.map(([username]) => username)
  const assignee = memberUsernames[i % memberUsernames.length]
  return [{ taskId: task.id, userId: U[assignee] }]
})

const COMMENT_POOL = [
  'API contract is ready for review.',
  "I've completed the initial implementation.",
  'Can we verify this on mobile as well?',
  'Looks good — merging after CI passes.',
  'Left a few notes inline, nothing blocking.',
]

const COMMENTS_PER_TASK = 2

const COMMENTS = TASKS.flatMap((task, i) => {
  const project = PROJECT_SEEDS[Math.floor(i / TASKS_PER_PROJECT)]
  const memberUsernames = project.members.map(([username]) => username)
  const comments = []
  for (let c = 0; c < COMMENTS_PER_TASK; c += 1) {
    const author = memberUsernames[(i + c) % memberUsernames.length]
    comments.push({
      id: makeDemoId('e', i * COMMENTS_PER_TASK + c + 1),
      taskId: task.id,
      authorId: U[author],
      content: COMMENT_POOL[(i + c) % COMMENT_POOL.length],
    })
  }
  return comments
})

// ---------------------------------------------------------------------------
// Persist — upsert everything in dependency order (idempotent on re-run).
// ---------------------------------------------------------------------------
async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS)

  for (const user of USERS) {
    await prisma.user.upsert({ where: { id: user.id }, create: { ...user, passwordHash }, update: { ...user, passwordHash } })
  }

  for (const project of PROJECTS) {
    await prisma.project.upsert({ where: { id: project.id }, create: project, update: project })
  }

  for (const member of PROJECT_MEMBERS) {
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: member.projectId, userId: member.userId } },
      create: member,
      update: { role: member.role },
    })
  }

  for (const board of BOARDS) {
    await prisma.board.upsert({ where: { id: board.id }, create: board, update: board })
  }

  for (const task of TASKS) {
    await prisma.task.upsert({ where: { id: task.id }, create: task, update: task })
  }

  for (const assignee of TASK_ASSIGNEES) {
    await prisma.taskAssignee.upsert({
      where: { taskId_userId: { taskId: assignee.taskId, userId: assignee.userId } },
      create: assignee,
      update: {},
    })
  }

  for (const comment of COMMENTS) {
    await prisma.comment.upsert({ where: { id: comment.id }, create: comment, update: comment })
  }

  // Notifications are generated by calling the REAL notification service
  // (server/src/services/notification.service.js) instead of inserting rows
  // directly — the same function every live mutation in the app calls —
  // per Phase 18.8's instruction to demonstrate the notification system
  // honestly. createNotification() has no fixed-id/upsert support (it always
  // assigns a fresh uuid(), matching how the real app creates one), so
  // idempotency here is a semantic check-before-create instead: skip a
  // (userId, type, projectId, taskId) combination that already exists,
  // rather than re-inserting it on every run.
  let notificationsCreated = 0

  async function seedNotification({ userId, type, message, projectId, taskId }) {
    const existing = await prisma.notification.findFirst({
      where: { userId, type, projectId: projectId ?? null, taskId: taskId ?? null },
      select: { id: true },
    })
    if (existing) return
    await createNotification({ userId, type, message, projectId, taskId })
    notificationsCreated += 1
  }

  for (const membership of PROJECT_MEMBERS) {
    const project = PROJECTS.find((p) => p.id === membership.projectId)
    if (membership.userId === project.ownerId) continue
    await seedNotification({
      userId: membership.userId,
      type: 'PROJECT_MEMBER_ADDED',
      message: `You were added to "${project.name}".`,
      projectId: project.id,
    })
  }

  for (const assignee of TASK_ASSIGNEES) {
    const task = TASKS.find((t) => t.id === assignee.taskId)
    if (assignee.userId === task.createdById) continue
    await seedNotification({
      userId: assignee.userId,
      type: 'TASK_ASSIGNED',
      message: `You were assigned to "${task.title}".`,
      projectId: task.projectId,
      taskId: task.id,
    })
  }

  for (const comment of COMMENTS) {
    const task = TASKS.find((t) => t.id === comment.taskId)
    if (comment.authorId === task.createdById) continue
    await seedNotification({
      userId: task.createdById,
      type: 'TASK_COMMENTED',
      message: `New comment on "${task.title}".`,
      projectId: task.projectId,
      taskId: task.id,
    })
  }

  // A rotating subset are marked read afterward, via the real markAsRead
  // path (a plain update — no service import needed for this one, since
  // "read" has no side effects to reproduce), so the demo shows a realistic
  // mix of read/unread rather than either extreme.
  const demoNotifications = await prisma.notification.findMany({
    where: { userId: { in: USERS.map((u) => u.id) } },
    select: { id: true },
    orderBy: { id: 'asc' },
  })
  await Promise.all(
    demoNotifications
      .filter((_, i) => i % 3 === 0)
      .map((n) => prisma.notification.update({ where: { id: n.id }, data: { read: true } })),
  )

  console.log('Demo seed complete:')
  console.log(`  users:              ${USERS.length}`)
  console.log(`  projects:           ${PROJECTS.length}`)
  console.log(`  members:            ${PROJECT_MEMBERS.length}`)
  console.log(`  boards:             ${BOARDS.length}`)
  console.log(`  tasks:              ${TASKS.length}`)
  console.log(`  assignees:          ${TASK_ASSIGNEES.length}`)
  console.log(`  comments:           ${COMMENTS.length}`)
  console.log(`  notifications seen: ${demoNotifications.length} (created this run: ${notificationsCreated})`)
  console.log(`  demo password (all demo accounts): ${DEMO_PASSWORD}`)
  console.log('  No Activity rows are written by this script — see docs/DEMO_DATA.md.')
}

main()
  .catch((error) => {
    console.error('Demo seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
