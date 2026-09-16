import { describe, it, expect, beforeEach } from 'vitest'
import { api, resetDb, registerUser, createProject, authHeader } from '../helpers.js'

describe('projects', () => {
  beforeEach(async () => {
    await resetDb()
  })

  describe('POST /api/projects', () => {
    it('creates a project and the caller becomes OWNER', async () => {
      const { token } = await registerUser()
      const project = await createProject(token, { name: 'New Project', description: 'A description.' })
      expect(project.role).toBe('OWNER')
      expect(project.memberCount).toBe(1)
    })

    it('rejects an empty name', async () => {
      const { token } = await registerUser()
      const res = await api.post('/api/projects').set(authHeader(token)).send({ name: '' })
      expect(res.status).toBe(400)
    })

    it('rejects a mass-assignment attempt (ownerId in body)', async () => {
      const { token } = await registerUser()
      const other = await registerUser()
      const res = await api
        .post('/api/projects')
        .set(authHeader(token))
        .send({ name: 'Hijack Attempt', ownerId: other.user.id })
      expect(res.status).toBe(400)
    })

    it('rejects unauthenticated requests', async () => {
      const res = await api.post('/api/projects').send({ name: 'No Auth' })
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/projects', () => {
    it('only lists projects the caller belongs to', async () => {
      const { token } = await registerUser()
      const other = await registerUser()
      await createProject(token, { name: 'Mine' })
      await createProject(other.token, { name: 'Not Mine' })

      const res = await api.get('/api/projects').set(authHeader(token))
      expect(res.status).toBe(200)
      const names = res.body.data.projects.map((p) => p.name)
      expect(names).toContain('Mine')
      expect(names).not.toContain('Not Mine')
    })
  })

  describe('GET /api/projects/:projectId', () => {
    it('returns detail for a member', async () => {
      const { token } = await registerUser()
      const project = await createProject(token)
      const res = await api.get(`/api/projects/${project.id}`).set(authHeader(token))
      expect(res.status).toBe(200)
      expect(res.body.data.project.role).toBe('OWNER')
    })

    it('returns 403 for a non-member of an existing project', async () => {
      const { token } = await registerUser()
      const project = await createProject(token)
      const outsider = await registerUser()
      const res = await api.get(`/api/projects/${project.id}`).set(authHeader(outsider.token))
      expect(res.status).toBe(403)
    })

    it('returns 404 for a genuinely nonexistent project id', async () => {
      const { token } = await registerUser()
      const res = await api.get('/api/projects/11111111-1111-4111-8111-111111111111').set(authHeader(token))
      expect(res.status).toBe(404)
    })

    it('returns 404 (not 400) for a malformed project id', async () => {
      const { token } = await registerUser()
      const res = await api.get('/api/projects/not-a-uuid').set(authHeader(token))
      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /api/projects/:projectId', () => {
    it('OWNER can update', async () => {
      const { token } = await registerUser()
      const project = await createProject(token)
      const res = await api.patch(`/api/projects/${project.id}`).set(authHeader(token)).send({ name: 'Renamed' })
      expect(res.status).toBe(200)
      expect(res.body.data.project.name).toBe('Renamed')
    })

    it('ADMIN can update', async () => {
      const owner = await registerUser()
      const admin = await registerUser()
      const project = await createProject(owner.token)
      await api.post(`/api/projects/${project.id}/members`).set(authHeader(owner.token)).send({ userId: admin.user.id, role: 'ADMIN' })
      const res = await api.patch(`/api/projects/${project.id}`).set(authHeader(admin.token)).send({ name: 'Renamed by admin' })
      expect(res.status).toBe(200)
    })

    it('MEMBER cannot update', async () => {
      const owner = await registerUser()
      const member = await registerUser()
      const project = await createProject(owner.token)
      await api.post(`/api/projects/${project.id}/members`).set(authHeader(owner.token)).send({ userId: member.user.id })
      const res = await api.patch(`/api/projects/${project.id}`).set(authHeader(member.token)).send({ name: 'Renamed by member' })
      expect(res.status).toBe(403)
    })

    it('rejects an unsupported field (id spoof)', async () => {
      const { token } = await registerUser()
      const project = await createProject(token)
      const res = await api.patch(`/api/projects/${project.id}`).set(authHeader(token)).send({ id: '11111111-1111-4111-8111-111111111111' })
      expect(res.status).toBe(400)
    })
  })

  describe('DELETE /api/projects/:projectId', () => {
    it('OWNER can delete', async () => {
      const { token } = await registerUser()
      const project = await createProject(token)
      const res = await api.delete(`/api/projects/${project.id}`).set(authHeader(token))
      expect(res.status).toBe(200)
    })

    it('ADMIN cannot delete (OWNER only)', async () => {
      const owner = await registerUser()
      const admin = await registerUser()
      const project = await createProject(owner.token)
      await api.post(`/api/projects/${project.id}/members`).set(authHeader(owner.token)).send({ userId: admin.user.id, role: 'ADMIN' })
      const res = await api.delete(`/api/projects/${project.id}`).set(authHeader(admin.token))
      expect(res.status).toBe(403)
    })

    it('MEMBER cannot delete', async () => {
      const owner = await registerUser()
      const member = await registerUser()
      const project = await createProject(owner.token)
      await api.post(`/api/projects/${project.id}/members`).set(authHeader(owner.token)).send({ userId: member.user.id })
      const res = await api.delete(`/api/projects/${project.id}`).set(authHeader(member.token))
      expect(res.status).toBe(403)
    })

    it('non-member gets 403, not 404 (existence not confirmed either way beyond that)', async () => {
      const { token } = await registerUser()
      const project = await createProject(token)
      const outsider = await registerUser()
      const res = await api.delete(`/api/projects/${project.id}`).set(authHeader(outsider.token))
      expect(res.status).toBe(403)
    })
  })
})
