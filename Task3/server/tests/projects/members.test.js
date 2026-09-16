import { describe, it, expect, beforeEach } from 'vitest'
import { api, resetDb, registerUser, createProject, addMember, authHeader } from '../helpers.js'

describe('project membership', () => {
  beforeEach(async () => {
    await resetDb()
  })

  describe('POST /api/projects/:projectId/members', () => {
    it('OWNER can add a member (defaults to MEMBER role)', async () => {
      const owner = await registerUser()
      const newMember = await registerUser()
      const project = await createProject(owner.token)
      const res = await addMember(owner.token, project.id, newMember.user.id)
      expect(res.status).toBe(201)
      expect(res.body.data.member.role).toBe('MEMBER')
    })

    it('ADMIN can add a member', async () => {
      const owner = await registerUser()
      const admin = await registerUser()
      const newMember = await registerUser()
      const project = await createProject(owner.token)
      await addMember(owner.token, project.id, admin.user.id, 'ADMIN')
      const res = await addMember(admin.token, project.id, newMember.user.id)
      expect(res.status).toBe(201)
    })

    it('MEMBER cannot add a member', async () => {
      const owner = await registerUser()
      const member = await registerUser()
      const anotherUser = await registerUser()
      const project = await createProject(owner.token)
      await addMember(owner.token, project.id, member.user.id)
      const res = await addMember(member.token, project.id, anotherUser.user.id)
      expect(res.status).toBe(403)
    })

    it('rejects assigning OWNER via the request body (privilege escalation attempt)', async () => {
      const owner = await registerUser()
      const newMember = await registerUser()
      const project = await createProject(owner.token)
      const res = await addMember(owner.token, project.id, newMember.user.id, 'OWNER')
      expect(res.status).toBe(400)
    })

    it('rejects a duplicate membership (409)', async () => {
      const owner = await registerUser()
      const newMember = await registerUser()
      const project = await createProject(owner.token)
      await addMember(owner.token, project.id, newMember.user.id)
      const res = await addMember(owner.token, project.id, newMember.user.id)
      expect(res.status).toBe(409)
    })

    it('rejects a nonexistent userId with 404', async () => {
      const owner = await registerUser()
      const project = await createProject(owner.token)
      const res = await addMember(owner.token, project.id, '11111111-1111-4111-8111-111111111111')
      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/projects/:projectId/members', () => {
    it('lists members with safe fields only', async () => {
      const owner = await registerUser()
      const project = await createProject(owner.token)
      const res = await api.get(`/api/projects/${project.id}/members`).set(authHeader(owner.token))
      expect(res.status).toBe(200)
      expect(res.body.data.members[0].role).toBe('OWNER')
      expect(JSON.stringify(res.body)).not.toContain('email')
      expect(JSON.stringify(res.body)).not.toContain('passwordHash')
    })

    it('non-member cannot list members', async () => {
      const owner = await registerUser()
      const outsider = await registerUser()
      const project = await createProject(owner.token)
      const res = await api.get(`/api/projects/${project.id}/members`).set(authHeader(outsider.token))
      expect(res.status).toBe(403)
    })
  })

  describe('DELETE /api/projects/:projectId/members/:userId', () => {
    it('OWNER can remove a member', async () => {
      const owner = await registerUser()
      const member = await registerUser()
      const project = await createProject(owner.token)
      await addMember(owner.token, project.id, member.user.id)
      const res = await api.delete(`/api/projects/${project.id}/members/${member.user.id}`).set(authHeader(owner.token))
      expect(res.status).toBe(200)
    })

    it('MEMBER cannot remove another member', async () => {
      const owner = await registerUser()
      const memberOne = await registerUser()
      const memberTwo = await registerUser()
      const project = await createProject(owner.token)
      await addMember(owner.token, project.id, memberOne.user.id)
      await addMember(owner.token, project.id, memberTwo.user.id)
      const res = await api
        .delete(`/api/projects/${project.id}/members/${memberTwo.user.id}`)
        .set(authHeader(memberOne.token))
      expect(res.status).toBe(403)
    })

    it('the owner cannot be removed through this endpoint, even by another admin', async () => {
      const owner = await registerUser()
      const admin = await registerUser()
      const project = await createProject(owner.token)
      await addMember(owner.token, project.id, admin.user.id, 'ADMIN')
      const res = await api.delete(`/api/projects/${project.id}/members/${owner.user.id}`).set(authHeader(admin.token))
      expect(res.status).toBe(403)
    })
  })

  describe('PATCH /api/projects/:projectId/members/:userId (role change)', () => {
    it('OWNER can promote a MEMBER to ADMIN', async () => {
      const owner = await registerUser()
      const member = await registerUser()
      const project = await createProject(owner.token)
      await addMember(owner.token, project.id, member.user.id)
      const res = await api
        .patch(`/api/projects/${project.id}/members/${member.user.id}`)
        .set(authHeader(owner.token))
        .send({ role: 'ADMIN' })
      expect(res.status).toBe(200)
      expect(res.body.data.member.role).toBe('ADMIN')
    })

    it('ADMIN cannot change roles (OWNER only)', async () => {
      const owner = await registerUser()
      const admin = await registerUser()
      const member = await registerUser()
      const project = await createProject(owner.token)
      await addMember(owner.token, project.id, admin.user.id, 'ADMIN')
      await addMember(owner.token, project.id, member.user.id)
      const res = await api
        .patch(`/api/projects/${project.id}/members/${member.user.id}`)
        .set(authHeader(admin.token))
        .send({ role: 'ADMIN' })
      expect(res.status).toBe(403)
    })

    it('MEMBER cannot change their own role (self-escalation attempt)', async () => {
      const owner = await registerUser()
      const member = await registerUser()
      const project = await createProject(owner.token)
      await addMember(owner.token, project.id, member.user.id)
      const res = await api
        .patch(`/api/projects/${project.id}/members/${member.user.id}`)
        .set(authHeader(member.token))
        .send({ role: 'ADMIN' })
      expect(res.status).toBe(403)
    })

    it('rejects setting role to OWNER (no second owner can ever be created)', async () => {
      const owner = await registerUser()
      const member = await registerUser()
      const project = await createProject(owner.token)
      await addMember(owner.token, project.id, member.user.id)
      const res = await api
        .patch(`/api/projects/${project.id}/members/${member.user.id}`)
        .set(authHeader(owner.token))
        .send({ role: 'OWNER' })
      expect(res.status).toBe(400)
    })

    it("cannot change the owner's own role", async () => {
      const owner = await registerUser()
      const project = await createProject(owner.token)
      const res = await api
        .patch(`/api/projects/${project.id}/members/${owner.user.id}`)
        .set(authHeader(owner.token))
        .send({ role: 'ADMIN' })
      expect(res.status).toBe(403)
    })
  })
})
