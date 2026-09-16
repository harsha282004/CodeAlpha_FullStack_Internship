import { describe, it, expect, beforeEach } from 'vitest'
import { api, resetDb, registerUser, createProject, createBoard, addMember, authHeader } from '../helpers.js'

describe('boards', () => {
  beforeEach(async () => {
    await resetDb()
  })

  describe('POST /api/projects/:projectId/boards', () => {
    it('any member can create a board, position auto-assigned', async () => {
      const owner = await registerUser()
      const member = await registerUser()
      const project = await createProject(owner.token)
      await addMember(owner.token, project.id, member.user.id)
      const first = await createBoard(member.token, project.id, { name: 'To Do' })
      const second = await createBoard(member.token, project.id, { name: 'Done' })
      expect(first.position).toBe(0)
      expect(second.position).toBe(1)
    })

    it('rejects a non-member', async () => {
      const owner = await registerUser()
      const outsider = await registerUser()
      const project = await createProject(owner.token)
      const res = await api.post(`/api/projects/${project.id}/boards`).set(authHeader(outsider.token)).send({ name: 'X' })
      expect(res.status).toBe(403)
    })

    it('rejects an empty name', async () => {
      const owner = await registerUser()
      const project = await createProject(owner.token)
      const res = await api.post(`/api/projects/${project.id}/boards`).set(authHeader(owner.token)).send({ name: '' })
      expect(res.status).toBe(400)
    })

    it('rejects a mass-assignment attempt (projectId spoof in body)', async () => {
      const owner = await registerUser()
      const otherOwner = await registerUser()
      const project = await createProject(owner.token)
      const otherProject = await createProject(otherOwner.token)
      const res = await api
        .post(`/api/projects/${project.id}/boards`)
        .set(authHeader(owner.token))
        .send({ name: 'Sneaky', projectId: otherProject.id })
      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/projects/:projectId/boards/:boardId', () => {
    it('a board from a different project is 404, not 403, through this project URL', async () => {
      const ownerA = await registerUser()
      const ownerB = await registerUser()
      const projectA = await createProject(ownerA.token)
      const projectB = await createProject(ownerB.token)
      const boardB = await createBoard(ownerB.token, projectB.id)

      const res = await api.get(`/api/projects/${projectA.id}/boards/${boardB.id}`).set(authHeader(ownerA.token))
      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /api/projects/:projectId/boards/:boardId', () => {
    it('OWNER/ADMIN can rename', async () => {
      const owner = await registerUser()
      const project = await createProject(owner.token)
      const board = await createBoard(owner.token, project.id)
      const res = await api
        .patch(`/api/projects/${project.id}/boards/${board.id}`)
        .set(authHeader(owner.token))
        .send({ name: 'Renamed' })
      expect(res.status).toBe(200)
      expect(res.body.data.board.name).toBe('Renamed')
    })

    it('MEMBER cannot rename', async () => {
      const owner = await registerUser()
      const member = await registerUser()
      const project = await createProject(owner.token)
      await addMember(owner.token, project.id, member.user.id)
      const board = await createBoard(owner.token, project.id)
      const res = await api
        .patch(`/api/projects/${project.id}/boards/${board.id}`)
        .set(authHeader(member.token))
        .send({ name: 'Renamed by member' })
      expect(res.status).toBe(403)
    })

    it('rejects a negative position', async () => {
      const owner = await registerUser()
      const project = await createProject(owner.token)
      const board = await createBoard(owner.token, project.id)
      const res = await api
        .patch(`/api/projects/${project.id}/boards/${board.id}`)
        .set(authHeader(owner.token))
        .send({ position: -1 })
      expect(res.status).toBe(400)
    })
  })

  describe('DELETE /api/projects/:projectId/boards/:boardId', () => {
    it('MEMBER cannot delete', async () => {
      const owner = await registerUser()
      const member = await registerUser()
      const project = await createProject(owner.token)
      await addMember(owner.token, project.id, member.user.id)
      const board = await createBoard(owner.token, project.id)
      const res = await api.delete(`/api/projects/${project.id}/boards/${board.id}`).set(authHeader(member.token))
      expect(res.status).toBe(403)
    })

    it('OWNER can delete', async () => {
      const owner = await registerUser()
      const project = await createProject(owner.token)
      const board = await createBoard(owner.token, project.id)
      const res = await api.delete(`/api/projects/${project.id}/boards/${board.id}`).set(authHeader(owner.token))
      expect(res.status).toBe(200)
    })
  })
})
