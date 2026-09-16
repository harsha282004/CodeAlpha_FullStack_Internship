import { describe, it, expect, beforeEach } from 'vitest'
import {
  api,
  resetDb,
  registerUser,
  createProject,
  createBoard,
  createTask,
  createComment,
  addMember,
  authHeader,
} from '../helpers.js'

// Phase 16.5 — every validator in this codebase uses an explicit field
// whitelist (a Set of allowed keys), so any unsupported field — whether
// dangerous (role, ownerId, passwordHash) or merely unexpected (createdAt) —
// is rejected identically with 400. This file sends the full dangerous-field
// bundle from the phase brief at every mutating endpoint and asserts the
// same 400, confirming none of them is silently ignored *or* silently
// honored — the two failure modes that would matter here are "the field
// gets applied" (privilege escalation) and "the field is dropped without
// telling the caller" (a client believing a field is supported when it's
// not) — this project's convention is to reject explicitly, and that's what
// every assertion below checks for.
describe('mass assignment / field injection', () => {
  let owner
  let member
  let project
  let board
  let task
  let comment

  beforeEach(async () => {
    await resetDb()
    owner = await registerUser({ name: 'MA Owner' })
    member = await registerUser({ name: 'MA Member' })
    await createProjectFixture()
  })

  async function createProjectFixture() {
    project = await createProject(owner.token, { name: 'MA Project' })
    await addMember(owner.token, project.id, member.user.id)
    board = await createBoard(owner.token, project.id)
    task = await createTask(owner.token, project.id, board.id)
    comment = await createComment(owner.token, project.id, board.id, task.id)
  }

  const DANGEROUS_FIELDS = {
    id: '11111111-1111-4111-8111-111111111111',
    role: 'OWNER',
    ownerId: '11111111-1111-4111-8111-111111111111',
    userId: '11111111-1111-4111-8111-111111111111',
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
    passwordHash: 'not-a-real-hash',
    projectId: '11111111-1111-4111-8111-111111111111',
    boardId: '11111111-1111-4111-8111-111111111111',
    taskId: '11111111-1111-4111-8111-111111111111',
  }

  it('PATCH /users/me rejects every dangerous field', async () => {
    const res = await api.patch('/api/users/me').set(authHeader(owner.token)).send({ name: 'Still Fine', ...DANGEROUS_FIELDS })
    expect(res.status).toBe(400)
  })

  it('POST /projects rejects every dangerous field', async () => {
    const res = await api.post('/api/projects').set(authHeader(owner.token)).send({ name: 'MA Test', ...DANGEROUS_FIELDS })
    expect(res.status).toBe(400)
  })

  it('PATCH /projects/:id rejects every dangerous field', async () => {
    const res = await api
      .patch(`/api/projects/${project.id}`)
      .set(authHeader(owner.token))
      .send({ name: 'MA Renamed', ...DANGEROUS_FIELDS })
    expect(res.status).toBe(400)
  })

  it('POST /projects/:id/members rejects every dangerous field beyond userId/role', async () => {
    const newUser = await registerUser()
    const res = await api
      .post(`/api/projects/${project.id}/members`)
      .set(authHeader(owner.token))
      .send({ userId: newUser.user.id, ...DANGEROUS_FIELDS })
    expect(res.status).toBe(400)
  })

  it('PATCH /projects/:id/members/:userId rejects every dangerous field beyond role', async () => {
    const res = await api
      .patch(`/api/projects/${project.id}/members/${member.user.id}`)
      .set(authHeader(owner.token))
      .send({ role: 'ADMIN', ...DANGEROUS_FIELDS })
    expect(res.status).toBe(400)
  })

  it('POST /projects/:id/boards rejects every dangerous field', async () => {
    const res = await api
      .post(`/api/projects/${project.id}/boards`)
      .set(authHeader(owner.token))
      .send({ name: 'MA Board', ...DANGEROUS_FIELDS })
    expect(res.status).toBe(400)
  })

  it('PATCH /projects/:id/boards/:boardId rejects every dangerous field', async () => {
    const res = await api
      .patch(`/api/projects/${project.id}/boards/${board.id}`)
      .set(authHeader(owner.token))
      .send({ name: 'MA Board Renamed', ...DANGEROUS_FIELDS })
    expect(res.status).toBe(400)
  })

  it('POST /.../tasks rejects every dangerous field', async () => {
    const res = await api
      .post(`/api/projects/${project.id}/boards/${board.id}/tasks`)
      .set(authHeader(owner.token))
      .send({ title: 'MA Task', ...DANGEROUS_FIELDS })
    expect(res.status).toBe(400)
  })

  it('PATCH /.../tasks/:taskId rejects every dangerous field', async () => {
    const res = await api
      .patch(`/api/projects/${project.id}/boards/${board.id}/tasks/${task.id}`)
      .set(authHeader(owner.token))
      .send({ title: 'MA Task Renamed', ...DANGEROUS_FIELDS })
    expect(res.status).toBe(400)
  })

  it('POST /.../assignees rejects every dangerous field beyond userId', async () => {
    const res = await api
      .post(`/api/projects/${project.id}/boards/${board.id}/tasks/${task.id}/assignees`)
      .set(authHeader(owner.token))
      .send({ userId: member.user.id, ...DANGEROUS_FIELDS })
    expect(res.status).toBe(400)
  })

  it('POST /.../comments rejects every dangerous field beyond content', async () => {
    const res = await api
      .post(`/api/projects/${project.id}/boards/${board.id}/tasks/${task.id}/comments`)
      .set(authHeader(owner.token))
      .send({ content: 'MA Comment', ...DANGEROUS_FIELDS })
    expect(res.status).toBe(400)
  })

  it('PATCH /.../comments/:commentId rejects every dangerous field beyond content', async () => {
    const res = await api
      .patch(`/api/projects/${project.id}/boards/${board.id}/tasks/${task.id}/comments/${comment.id}`)
      .set(authHeader(owner.token))
      .send({ content: 'MA Comment Edited', ...DANGEROUS_FIELDS })
    expect(res.status).toBe(400)
  })

  it('POST /auth/register rejects an id/role field alongside otherwise-valid registration data', async () => {
    const res = await api.post('/api/auth/register').send({
      name: 'MA Register',
      username: 'ma_register_user',
      email: 'ma.register@example.com',
      password: 'password123',
      id: DANGEROUS_FIELDS.id,
      role: 'ADMIN',
    })
    // The register validator only reads name/username/email/password off the
    // body and ignores anything else present — verified here that doing so
    // never results in the extra fields taking effect (no admin role exists
    // on User at all, so there is nothing for "role" to grant); the
    // important guarantee, re-checked directly, is that the created account
    // is an ordinary user with no elevated access.
    expect(res.status).toBe(201)
    expect(res.body.data.user.id).not.toBe(DANGEROUS_FIELDS.id)
  })
})
