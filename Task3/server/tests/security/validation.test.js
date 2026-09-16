import { describe, it, expect, beforeEach } from 'vitest'
import { api, resetDb, registerUser, createProject, createBoard, authHeader } from '../helpers.js'

// Phase 16.7 — input validation sweep, consolidated across resources rather
// than duplicated per-resource-file (each resource file already covers its
// own domain-specific validation rules in depth; this file focuses on the
// generic classes of bad input the phase brief calls out by name).
describe('input validation', () => {
  let owner
  let project

  beforeEach(async () => {
    await resetDb()
    owner = await registerUser()
    project = await createProject(owner.token)
  })

  it('malformed JSON body -> 400, not a raw parser error', async () => {
    const res = await api
      .post('/api/projects')
      .set(authHeader(owner.token))
      .set('Content-Type', 'application/json')
      .send('{ this is not valid json')
    expect(res.status).toBe(400)
    expect(res.body.code).toBe('INVALID_JSON')
  })

  it('an oversized request body is rejected (413), not silently accepted', async () => {
    const res = await api
      .post('/api/projects')
      .set(authHeader(owner.token))
      .send({ name: 'Big', description: 'x'.repeat(200_000) })
    expect(res.status).toBe(413)
  })

  it('a malformed (non-UUID) id in a URL path param is 404, never a raw 500', async () => {
    const res = await api.get('/api/projects/this-is-not-a-uuid').set(authHeader(owner.token))
    expect(res.status).toBe(404)
  })

  it('null where a string is expected is rejected, not coerced', async () => {
    const res = await api.post('/api/projects').set(authHeader(owner.token)).send({ name: null })
    expect(res.status).toBe(400)
  })

  it('a number where a string is expected is rejected, not coerced', async () => {
    const res = await api.post('/api/projects').set(authHeader(owner.token)).send({ name: 12345 })
    expect(res.status).toBe(400)
  })

  it('an excessively long name is rejected rather than silently truncated', async () => {
    const res = await api.post('/api/projects').set(authHeader(owner.token)).send({ name: 'x'.repeat(500) })
    expect(res.status).toBe(400)
  })

  it('a negative pagination page is rejected', async () => {
    const res = await api.get('/api/projects').query({ page: '-1' }).set(authHeader(owner.token))
    expect(res.status).toBe(400)
  })

  it('a huge pagination limit is rejected rather than silently clamped', async () => {
    const res = await api.get('/api/projects').query({ limit: '1000000' }).set(authHeader(owner.token))
    expect(res.status).toBe(400)
  })

  it('a non-numeric pagination value is rejected', async () => {
    const res = await api.get('/api/projects').query({ page: 'not-a-number' }).set(authHeader(owner.token))
    expect(res.status).toBe(400)
  })

  it('an invalid enum value (task priority) is rejected with a clear 400', async () => {
    const board = await createBoard(owner.token, project.id)
    const res = await api
      .post(`/api/projects/${project.id}/boards/${board.id}/tasks`)
      .set(authHeader(owner.token))
      .send({ title: 'Bad enum', priority: 'not-a-real-priority' })
    expect(res.status).toBe(400)
  })

  it('an invalid enum value (member role) is rejected with a clear 400', async () => {
    const other = await registerUser()
    const res = await api
      .post(`/api/projects/${project.id}/members`)
      .set(authHeader(owner.token))
      .send({ userId: other.user.id, role: 'SUPERADMIN' })
    expect(res.status).toBe(400)
  })

  it('an invalid due date string is rejected', async () => {
    const board = await createBoard(owner.token, project.id)
    const res = await api
      .post(`/api/projects/${project.id}/boards/${board.id}/tasks`)
      .set(authHeader(owner.token))
      .send({ title: 'Bad date', dueDate: 'not-a-date' })
    expect(res.status).toBe(400)
  })

  it('an invalid (non-http) avatarUrl scheme is rejected', async () => {
    const res = await api
      .patch('/api/users/me')
      .set(authHeader(owner.token))
      .send({ avatarUrl: 'javascript:alert(1)' })
    expect(res.status).toBe(400)
  })

  it('a whitespace-only required field is rejected, not just an empty string', async () => {
    const res = await api.post('/api/projects').set(authHeader(owner.token)).send({ name: '   ' })
    expect(res.status).toBe(400)
  })

  it('an array where a string is expected is rejected', async () => {
    const res = await api.post('/api/projects').set(authHeader(owner.token)).send({ name: ['not', 'a', 'string'] })
    expect(res.status).toBe(400)
  })

  it('a non-negative-integer position (float) is rejected', async () => {
    const res = await api
      .post(`/api/projects/${project.id}/boards`)
      .set(authHeader(owner.token))
      .send({ name: 'Board', position: 1.5 })
    expect(res.status).toBe(400)
  })

  it('an unauthenticated request to a route requiring a JSON body still gets 401 before any body validation', async () => {
    const res = await api.post('/api/projects').send({ name: 'No Auth' })
    expect(res.status).toBe(401)
  })
})
