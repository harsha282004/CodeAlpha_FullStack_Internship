import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Fixed, non-secret password used for every seeded dev account.
// Never logged as a hash, and only meaningful on a local development database.
const DEV_PASSWORD = 'Passw0rd!'
const SALT_ROUNDS = 10

// Deterministic UUID-shaped ids, one prefix per entity type, so re-running
// this script always upserts the same rows instead of creating duplicates.
function makeId(prefix, n) {
  return `${prefix}0000000-0000-4000-8000-${String(n).padStart(12, '0')}`
}

// ---------------------------------------------------------------------------
// Users (15)
// ---------------------------------------------------------------------------
const USER_SEEDS = [
  ['alice_johnson', 'Alice Johnson', 'Product manager keeping every roadmap honest.'],
  ['ben_carter', 'Ben Carter', 'Backend engineer. Database nerd.'],
  ['carla_diaz', 'Carla Diaz', 'Frontend engineer who obsesses over clean UI.'],
  ['derek_nguyen', 'Derek Nguyen', 'DevOps. Uptime obsessive.'],
  ['elena_petrova', 'Elena Petrova', 'UX designer and researcher.'],
  ['felix_omondi', 'Felix Omondi', 'QA engineer. Professional bug hunter.'],
  ['grace_kim', 'Grace Kim', 'Full-stack developer.'],
  ['hassan_ali', 'Hassan Ali', 'Mobile engineer, iOS and Android.'],
  ['irene_wallace', 'Irene Wallace', 'Scrum master keeping standups short.'],
  ['jack_sullivan', 'Jack Sullivan', 'Junior developer, eager to learn.'],
  ['karin_larsen', 'Karin Larsen', 'Data engineer.'],
  ['liam_oconnor', "Liam O'Connor", 'Security engineer.'],
  ['maria_gomez', 'Maria Gomez', 'Marketing lead.'],
  ['noah_fischer', 'Noah Fischer', 'Site reliability engineer.'],
  ['priya_nair', 'Priya Nair', 'Engineering manager.'],
]

const USERS = USER_SEEDS.map(([username, name, bio], i) => ({
  id: makeId('a', i + 1),
  name,
  username,
  email: `${username.replace(/_/g, '.')}@taskflow.dev`,
  bio,
  avatarUrl: `https://picsum.photos/seed/${username.replace(/_/g, '-')}/200/200`,
}))

// username -> id lookup used everywhere below
const U = Object.fromEntries(USERS.map((u) => [u.username, u.id]))

// ---------------------------------------------------------------------------
// Projects, membership, and boards
// ---------------------------------------------------------------------------
const PROJECT_SEEDS = [
  {
    name: 'Website Relaunch',
    description: 'Redesign and relaunch the public marketing site.',
    members: [
      ['alice_johnson', 'OWNER'],
      ['ben_carter', 'ADMIN'],
      ['carla_diaz', 'MEMBER'],
      ['elena_petrova', 'MEMBER'],
      ['felix_omondi', 'MEMBER'],
      ['jack_sullivan', 'MEMBER'],
    ],
  },
  {
    name: 'Mobile App v2',
    description: 'Next major release of the companion mobile app.',
    members: [
      ['grace_kim', 'OWNER'],
      ['hassan_ali', 'ADMIN'],
      ['ben_carter', 'MEMBER'],
      ['felix_omondi', 'MEMBER'],
      ['karin_larsen', 'MEMBER'],
      ['noah_fischer', 'MEMBER'],
    ],
  },
  {
    name: 'Internal Tooling',
    description: 'Internal developer productivity tools and dashboards.',
    members: [
      ['priya_nair', 'OWNER'],
      ['karin_larsen', 'ADMIN'],
      ['liam_oconnor', 'MEMBER'],
      ['derek_nguyen', 'MEMBER'],
      ['noah_fischer', 'MEMBER'],
      ['jack_sullivan', 'MEMBER'],
    ],
  },
  {
    name: 'Q3 Marketing Campaign',
    description: 'Cross-channel campaign planning and execution for Q3.',
    members: [
      ['maria_gomez', 'OWNER'],
      ['irene_wallace', 'ADMIN'],
      ['alice_johnson', 'MEMBER'],
      ['elena_petrova', 'MEMBER'],
    ],
  },
]

// The first member listed for each project is always its OWNER — used to
// resolve Project.ownerId below without repeating the username a third time.
const BOARD_NAMES = ['To Do', 'In Progress', 'Review', 'Done']

const PROJECTS = PROJECT_SEEDS.map((p, i) => ({
  id: makeId('b', i + 1),
  name: p.name,
  description: p.description,
  ownerId: U[p.members[0][0]],
}))

const PROJECT_MEMBERS = PROJECT_SEEDS.flatMap((p, i) =>
  p.members.map(([username, role]) => ({
    projectId: PROJECTS[i].id,
    userId: U[username],
    role,
  })),
)

const BOARDS = PROJECT_SEEDS.flatMap((p, i) =>
  BOARD_NAMES.map((name, position) => ({
    id: makeId('c', i * BOARD_NAMES.length + position + 1),
    projectId: PROJECTS[i].id,
    name,
    position,
  })),
)

// ---------------------------------------------------------------------------
// Tasks, assignees, comments
// ---------------------------------------------------------------------------
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

const TASK_TITLE_POOL = [
  ['Set up project repository', 'Initialize the repo, CI, and base folder structure.'],
  ['Draft technical design doc', 'Write up the approach so the team can review before work starts.'],
  ['Implement authentication flow', 'Wire up login and register end to end.'],
  ['Build settings page', 'Let users update their profile information.'],
  ['Fix responsive layout bug', 'Layout breaks below 480px on the main view.'],
  ['Add pagination to list view', 'The current view loads everything at once and is slow with real data.'],
  ['Write integration tests', 'Cover the main happy paths for this milestone.'],
  ['Review API error responses', 'Make sure every error path returns a consistent shape.'],
  ['Optimize database queries', 'A couple of endpoints are doing N+1 queries.'],
  ['Update onboarding copy', 'Copy reads awkwardly after the last round of feedback.'],
  ['Add dark mode support', 'Users have been asking for this for a while.'],
  ['Set up staging environment', 'Need a place to validate changes before they go out.'],
  ['Investigate flaky test', 'The same test fails intermittently in CI.'],
  ['Design empty states', 'Several views have no design for the zero-data case.'],
  ['Audit third-party dependencies', 'Check for outdated or vulnerable packages.'],
]

const TASKS_PER_PROJECT = 10

function buildTasksForProject(projectIndex, project, boards, memberUsernames) {
  const tasks = []
  for (let t = 0; t < TASKS_PER_PROJECT; t += 1) {
    const [title, description] = TASK_TITLE_POOL[(projectIndex * TASKS_PER_PROJECT + t) % TASK_TITLE_POOL.length]
    const board = boards[t % boards.length]
    const creator = memberUsernames[t % memberUsernames.length]
    const hasDueDate = t % 3 !== 0
    tasks.push({
      id: makeId('d', projectIndex * 100 + t + 1),
      projectId: project.id,
      boardId: board.id,
      title,
      description,
      priority: PRIORITIES[t % PRIORITIES.length],
      position: Math.floor(t / boards.length),
      dueDate: hasDueDate ? new Date(Date.UTC(2026, t % 12, 5 + (t % 20))) : null,
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
  const primary = memberUsernames[i % memberUsernames.length]
  const secondary = memberUsernames[(i + 2) % memberUsernames.length]
  const assignees = [{ taskId: task.id, userId: U[primary] }]
  // Roughly half of tasks get a second assignee, as long as it's a distinct person.
  if (secondary !== primary && i % 2 === 0) {
    assignees.push({ taskId: task.id, userId: U[secondary] })
  }
  return assignees
})

const COMMENT_POOL = [
  'Started looking into this — should have an update by end of day.',
  'Ran into a blocker with the API response shape, investigating.',
  'This is ready for review, left notes in the PR.',
  'Good catch — pushed a fix, can you confirm it works on your end?',
  "Let's sync on this tomorrow, I think there are two valid approaches.",
  'Marked this as done, tests are passing locally and in CI.',
  'Adding a bit more context here for whoever picks this up next.',
  'This ended up being bigger than expected, splitting into a follow-up task.',
  'Confirmed the fix resolves it on staging.',
  'Blocked on design sign-off before I can finish this.',
]

const COMMENTS_PER_TASK = 3

const COMMENTS = TASKS.flatMap((task, i) => {
  const project = PROJECT_SEEDS[Math.floor(i / TASKS_PER_PROJECT)]
  const memberUsernames = project.members.map(([username]) => username)
  const comments = []
  for (let c = 0; c < COMMENTS_PER_TASK; c += 1) {
    const author = memberUsernames[(i + c) % memberUsernames.length]
    comments.push({
      id: makeId('e', i * COMMENTS_PER_TASK + c + 1),
      taskId: task.id,
      authorId: U[author],
      content: COMMENT_POOL[(i + c) % COMMENT_POOL.length],
    })
  }
  return comments
})

// ---------------------------------------------------------------------------
// Notifications — derived as a side effect of membership, assignment, and
// comment data above, the same way the real service layer will create them.
// ---------------------------------------------------------------------------
const NOTIFICATIONS = []
let notificationSeq = 0

function addNotification(userId, type, message, projectId, taskId) {
  notificationSeq += 1
  NOTIFICATIONS.push({
    id: makeId('f', notificationSeq),
    userId,
    type,
    message,
    projectId: projectId ?? null,
    taskId: taskId ?? null,
    // A rotating subset are already read, so seeded data isn't unrealistically all-unread.
    read: notificationSeq % 4 === 0,
  })
}

for (const membership of PROJECT_MEMBERS) {
  const project = PROJECTS.find((p) => p.id === membership.projectId)
  if (membership.userId === project.ownerId) continue
  addNotification(membership.userId, 'PROJECT_MEMBER_ADDED', `You were added to "${project.name}".`, project.id, null)
}

for (const assignee of TASK_ASSIGNEES) {
  const task = TASKS.find((t) => t.id === assignee.taskId)
  if (assignee.userId === task.createdById) continue
  addNotification(assignee.userId, 'TASK_ASSIGNED', `You were assigned to "${task.title}".`, task.projectId, task.id)
}

for (const comment of COMMENTS) {
  const task = TASKS.find((t) => t.id === comment.taskId)
  if (comment.authorId === task.createdById) continue
  addNotification(task.createdById, 'TASK_COMMENTED', `New comment on "${task.title}".`, task.projectId, task.id)
}

// ---------------------------------------------------------------------------
// Activity — one project-level timeline entry per meaningful event above.
// ---------------------------------------------------------------------------
const ACTIVITIES = []
let activitySeq = 0

function addActivity(projectId, actorId, type, message, taskId) {
  activitySeq += 1
  ACTIVITIES.push({
    id: makeId('2', activitySeq),
    projectId,
    taskId: taskId ?? null,
    actorId,
    type,
    message,
  })
}

for (const project of PROJECTS) {
  addActivity(project.id, project.ownerId, 'PROJECT_CREATED', `${project.name} was created.`)
}

for (const membership of PROJECT_MEMBERS) {
  const project = PROJECTS.find((p) => p.id === membership.projectId)
  if (membership.userId === project.ownerId) continue
  addActivity(project.id, project.ownerId, 'MEMBER_ADDED', 'A new member joined the project.')
}

for (const task of TASKS) {
  addActivity(task.projectId, task.createdById, 'TASK_CREATED', `Task "${task.title}" was created.`, task.id)
}

for (const assignee of TASK_ASSIGNEES) {
  const task = TASKS.find((t) => t.id === assignee.taskId)
  addActivity(task.projectId, task.createdById, 'TASK_ASSIGNED', `Task "${task.title}" was assigned.`, task.id)
}

for (const comment of COMMENTS) {
  const task = TASKS.find((t) => t.id === comment.taskId)
  addActivity(task.projectId, comment.authorId, 'COMMENT_ADDED', `New comment added on "${task.title}".`, task.id)
}

// ---------------------------------------------------------------------------
// Persist — upsert everything in dependency order so re-running this script
// is idempotent and never creates duplicate rows.
// ---------------------------------------------------------------------------
async function main() {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, SALT_ROUNDS)

  for (const user of USERS) {
    await prisma.user.upsert({
      where: { id: user.id },
      create: { ...user, passwordHash },
      update: { ...user, passwordHash },
    })
  }

  for (const project of PROJECTS) {
    await prisma.project.upsert({
      where: { id: project.id },
      create: project,
      update: project,
    })
  }

  for (const member of PROJECT_MEMBERS) {
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: member.projectId, userId: member.userId } },
      create: member,
      update: { role: member.role },
    })
  }

  for (const board of BOARDS) {
    await prisma.board.upsert({
      where: { id: board.id },
      create: board,
      update: board,
    })
  }

  for (const task of TASKS) {
    await prisma.task.upsert({
      where: { id: task.id },
      create: task,
      update: task,
    })
  }

  for (const assignee of TASK_ASSIGNEES) {
    await prisma.taskAssignee.upsert({
      where: { taskId_userId: { taskId: assignee.taskId, userId: assignee.userId } },
      create: assignee,
      update: {},
    })
  }

  for (const comment of COMMENTS) {
    await prisma.comment.upsert({
      where: { id: comment.id },
      create: comment,
      update: comment,
    })
  }

  for (const notification of NOTIFICATIONS) {
    await prisma.notification.upsert({
      where: { id: notification.id },
      create: notification,
      update: notification,
    })
  }

  for (const activity of ACTIVITIES) {
    await prisma.activity.upsert({
      where: { id: activity.id },
      create: activity,
      update: activity,
    })
  }

  console.log('Seed complete:')
  console.log(`  users:         ${USERS.length}`)
  console.log(`  projects:      ${PROJECTS.length}`)
  console.log(`  members:       ${PROJECT_MEMBERS.length}`)
  console.log(`  boards:        ${BOARDS.length}`)
  console.log(`  tasks:         ${TASKS.length}`)
  console.log(`  assignees:     ${TASK_ASSIGNEES.length}`)
  console.log(`  comments:      ${COMMENTS.length}`)
  console.log(`  notifications: ${NOTIFICATIONS.length}`)
  console.log(`  activities:    ${ACTIVITIES.length}`)
  console.log(`  dev password (all seeded accounts): ${DEV_PASSWORD}`)
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
