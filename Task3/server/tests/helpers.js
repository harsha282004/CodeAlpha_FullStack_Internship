import request from 'supertest'
import app from '../src/app.js'
import { prisma } from '../src/config/prisma.js'

export const api = request(app)

// Deletes every application row in the isolated test database, in an order
// that respects foreign keys (children before parents). Re-verifies the
// same safety check as tests/setup.js immediately before running — belt and
// suspenders, since this is the one function in the whole suite capable of
// doing real damage if ever pointed at the wrong database.
export async function resetDb() {
  if (!process.env.DATABASE_URL?.includes('taskflow_test')) {
    throw new Error('resetDb() refused: DATABASE_URL does not point at taskflow_test')
  }
  await prisma.activity.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.taskAssignee.deleteMany()
  await prisma.task.deleteMany()
  await prisma.board.deleteMany()
  await prisma.projectMember.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()
}

let userSeq = 0

// Registers a fresh, unique user via the real /api/auth/register endpoint
// (never a direct Prisma insert) so every test exercises the actual
// validation/hashing/JWT-issuing code path, not a shortcut around it.
export async function registerUser(overrides = {}) {
  userSeq += 1
  const n = userSeq
  const body = {
    name: overrides.name ?? `Test User ${n}`,
    username: overrides.username ?? `test_user_${n}`,
    email: overrides.email ?? `test.user.${n}@example.com`,
    password: overrides.password ?? 'password123',
  }
  const res = await api.post('/api/auth/register').send(body)
  if (res.status !== 201) {
    throw new Error(`registerUser failed: ${res.status} ${JSON.stringify(res.body)}`)
  }
  return { token: res.body.data.token, user: res.body.data.user }
}

export function authHeader(token) {
  return { Authorization: `Bearer ${token}` }
}

export async function createProject(token, overrides = {}) {
  const res = await api
    .post('/api/projects')
    .set(authHeader(token))
    .send({ name: overrides.name ?? 'Test Project', description: overrides.description ?? null })
  if (res.status !== 201) {
    throw new Error(`createProject failed: ${res.status} ${JSON.stringify(res.body)}`)
  }
  return res.body.data.project
}

export async function addMember(token, projectId, userId, role) {
  const res = await api
    .post(`/api/projects/${projectId}/members`)
    .set(authHeader(token))
    .send(role ? { userId, role } : { userId })
  return res
}

export async function createBoard(token, projectId, overrides = {}) {
  const res = await api
    .post(`/api/projects/${projectId}/boards`)
    .set(authHeader(token))
    .send({ name: overrides.name ?? 'To Do', ...(overrides.position !== undefined ? { position: overrides.position } : {}) })
  if (res.status !== 201) {
    throw new Error(`createBoard failed: ${res.status} ${JSON.stringify(res.body)}`)
  }
  return res.body.data.board
}

export async function createTask(token, projectId, boardId, overrides = {}) {
  const res = await api
    .post(`/api/projects/${projectId}/boards/${boardId}/tasks`)
    .set(authHeader(token))
    .send({ title: overrides.title ?? 'Test Task', ...overrides })
  if (res.status !== 201) {
    throw new Error(`createTask failed: ${res.status} ${JSON.stringify(res.body)}`)
  }
  return res.body.data.task
}

export async function assignUser(token, projectId, boardId, taskId, userId) {
  return api
    .post(`/api/projects/${projectId}/boards/${boardId}/tasks/${taskId}/assignees`)
    .set(authHeader(token))
    .send({ userId })
}

export async function createComment(token, projectId, boardId, taskId, content = 'A test comment.') {
  const res = await api
    .post(`/api/projects/${projectId}/boards/${boardId}/tasks/${taskId}/comments`)
    .set(authHeader(token))
    .send({ content })
  if (res.status !== 201) {
    throw new Error(`createComment failed: ${res.status} ${JSON.stringify(res.body)}`)
  }
  return res.body.data.comment
}

// A convenience bundle for the isolation/authorization matrices used
// throughout tests/security and tests/isolation: two fully independent
// projects, each with its own owner/member and a full board -> task ->
// comment chain, plus a bare outsider who belongs to neither.
export async function buildTwoProjectFixture() {
  const ownerA = await registerUser({ name: 'Owner A' })
  const memberA = await registerUser({ name: 'Member A' })
  const ownerB = await registerUser({ name: 'Owner B' })
  const memberB = await registerUser({ name: 'Member B' })
  const outsider = await registerUser({ name: 'Outsider' })

  const projectA = await createProject(ownerA.token, { name: 'Project A' })
  await addMember(ownerA.token, projectA.id, memberA.user.id)
  const boardA = await createBoard(ownerA.token, projectA.id, { name: 'Board A' })
  const taskA = await createTask(ownerA.token, projectA.id, boardA.id, { title: 'Task A' })
  const commentA = await createComment(ownerA.token, projectA.id, boardA.id, taskA.id, 'Comment A')

  const projectB = await createProject(ownerB.token, { name: 'Project B' })
  await addMember(ownerB.token, projectB.id, memberB.user.id)
  const boardB = await createBoard(ownerB.token, projectB.id, { name: 'Board B' })
  const taskB = await createTask(ownerB.token, projectB.id, boardB.id, { title: 'Task B' })
  const commentB = await createComment(ownerB.token, projectB.id, boardB.id, taskB.id, 'Comment B')

  return {
    ownerA, memberA, ownerB, memberB, outsider,
    projectA, boardA, taskA, commentA,
    projectB, boardB, taskB, commentB,
  }
}
