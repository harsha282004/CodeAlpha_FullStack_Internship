import { describe, it, expect, beforeEach } from 'vitest'
import {
  api,
  resetDb,
  registerUser,
  createProject,
  createBoard,
  createTask,
  addMember,
  authHeader,
} from '../helpers.js'

describe('tasks', () => {
  beforeEach(async () => {
    await resetDb()
  })

  describe('POST /.../tasks', () => {
    it('any member can create a task; position auto-assigned; default priority MEDIUM', async () => {
      const owner = await registerUser()
      const project = await createProject(owner.token)
      const board = await createBoard(owner.token, project.id)
      const task = await createTask(owner.token, project.id, board.id, { title: 'First' })
      expect(task.position).toBe(0)
      expect(task.priority).toBe('MEDIUM')
    })

    it('accepts a valid priority', async () => {
      const owner = await registerUser()
      const project = await createProject(owner.token)
      const board = await createBoard(owner.token, project.id)
      const task = await createTask(owner.token, project.id, board.id, { title: 'Urgent', priority: 'URGENT' })
      expect(task.priority).toBe('URGENT')
    })

    it('rejects an invalid priority enum value', async () => {
      const owner = await registerUser()
      const project = await createProject(owner.token)
      const board = await createBoard(owner.token, project.id)
      const res = await api
        .post(`/api/projects/${project.id}/boards/${board.id}/tasks`)
        .set(authHeader(owner.token))
        .send({ title: 'Bad priority', priority: 'SUPER_URGENT' })
      expect(res.status).toBe(400)
    })

    it("rejects a 'status' field with an explanatory message (no status concept exists)", async () => {
      const owner = await registerUser()
      const project = await createProject(owner.token)
      const board = await createBoard(owner.token, project.id)
      const res = await api
        .post(`/api/projects/${project.id}/boards/${board.id}/tasks`)
        .set(authHeader(owner.token))
        .send({ title: 'Has status', status: 'IN_PROGRESS' })
      expect(res.status).toBe(400)
    })

    it('rejects an empty title', async () => {
      const owner = await registerUser()
      const project = await createProject(owner.token)
      const board = await createBoard(owner.token, project.id)
      const res = await api
        .post(`/api/projects/${project.id}/boards/${board.id}/tasks`)
        .set(authHeader(owner.token))
        .send({ title: '' })
      expect(res.status).toBe(400)
    })

    it('rejects a non-member', async () => {
      const owner = await registerUser()
      const outsider = await registerUser()
      const project = await createProject(owner.token)
      const board = await createBoard(owner.token, project.id)
      const res = await api
        .post(`/api/projects/${project.id}/boards/${board.id}/tasks`)
        .set(authHeader(outsider.token))
        .send({ title: 'Nope' })
      expect(res.status).toBe(403)
    })

    it('rejects mass assignment of createdById/projectId/boardId', async () => {
      const owner = await registerUser()
      const other = await registerUser()
      const project = await createProject(owner.token)
      const board = await createBoard(owner.token, project.id)
      const res = await api
        .post(`/api/projects/${project.id}/boards/${board.id}/tasks`)
        .set(authHeader(owner.token))
        .send({ title: 'Spoofed', createdById: other.user.id })
      expect(res.status).toBe(400)
    })
  })

  describe('GET /.../tasks/:taskId (hierarchy isolation)', () => {
    it('a task from a sibling board (same project) is 404 through the wrong board', async () => {
      const owner = await registerUser()
      const project = await createProject(owner.token)
      const boardOne = await createBoard(owner.token, project.id, { name: 'One' })
      const boardTwo = await createBoard(owner.token, project.id, { name: 'Two' })
      const task = await createTask(owner.token, project.id, boardOne.id)

      const res = await api
        .get(`/api/projects/${project.id}/boards/${boardTwo.id}/tasks/${task.id}`)
        .set(authHeader(owner.token))
      expect(res.status).toBe(404)
    })

    it('a task from an entirely different project is 404', async () => {
      const ownerA = await registerUser()
      const ownerB = await registerUser()
      const projectA = await createProject(ownerA.token)
      const projectB = await createProject(ownerB.token)
      const boardA = await createBoard(ownerA.token, projectA.id)
      const boardB = await createBoard(ownerB.token, projectB.id)
      const taskB = await createTask(ownerB.token, projectB.id, boardB.id)

      const res = await api
        .get(`/api/projects/${projectA.id}/boards/${boardA.id}/tasks/${taskB.id}`)
        .set(authHeader(ownerA.token))
      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /.../tasks/:taskId', () => {
    it('any member can update title/description/priority/position/dueDate', async () => {
      const owner = await registerUser()
      const member = await registerUser()
      const project = await createProject(owner.token)
      await addMember(owner.token, project.id, member.user.id)
      const board = await createBoard(owner.token, project.id)
      const task = await createTask(owner.token, project.id, board.id)

      const res = await api
        .patch(`/api/projects/${project.id}/boards/${board.id}/tasks/${task.id}`)
        .set(authHeader(member.token))
        .send({ title: 'Updated by member', priority: 'HIGH', position: 3 })
      expect(res.status).toBe(200)
      expect(res.body.data.task.title).toBe('Updated by member')
    })

    it('rejects a non-member', async () => {
      const owner = await registerUser()
      const outsider = await registerUser()
      const project = await createProject(owner.token)
      const board = await createBoard(owner.token, project.id)
      const task = await createTask(owner.token, project.id, board.id)
      const res = await api
        .patch(`/api/projects/${project.id}/boards/${board.id}/tasks/${task.id}`)
        .set(authHeader(outsider.token))
        .send({ title: 'Hijacked' })
      expect(res.status).toBe(403)
    })

    it('rejects an attempt to move to a different board via boardId in the body', async () => {
      const owner = await registerUser()
      const project = await createProject(owner.token)
      const boardOne = await createBoard(owner.token, project.id, { name: 'One' })
      const boardTwo = await createBoard(owner.token, project.id, { name: 'Two' })
      const task = await createTask(owner.token, project.id, boardOne.id)
      const res = await api
        .patch(`/api/projects/${project.id}/boards/${boardOne.id}/tasks/${task.id}`)
        .set(authHeader(owner.token))
        .send({ boardId: boardTwo.id })
      expect(res.status).toBe(400)
    })

    it('rejects a negative position', async () => {
      const owner = await registerUser()
      const project = await createProject(owner.token)
      const board = await createBoard(owner.token, project.id)
      const task = await createTask(owner.token, project.id, board.id)
      const res = await api
        .patch(`/api/projects/${project.id}/boards/${board.id}/tasks/${task.id}`)
        .set(authHeader(owner.token))
        .send({ position: -5 })
      expect(res.status).toBe(400)
    })

    it('rejects an empty body', async () => {
      const owner = await registerUser()
      const project = await createProject(owner.token)
      const board = await createBoard(owner.token, project.id)
      const task = await createTask(owner.token, project.id, board.id)
      const res = await api
        .patch(`/api/projects/${project.id}/boards/${board.id}/tasks/${task.id}`)
        .set(authHeader(owner.token))
        .send({})
      expect(res.status).toBe(400)
    })
  })

  describe('DELETE /.../tasks/:taskId', () => {
    it('MEMBER cannot delete a task', async () => {
      const owner = await registerUser()
      const member = await registerUser()
      const project = await createProject(owner.token)
      await addMember(owner.token, project.id, member.user.id)
      const board = await createBoard(owner.token, project.id)
      const task = await createTask(owner.token, project.id, board.id)
      const res = await api
        .delete(`/api/projects/${project.id}/boards/${board.id}/tasks/${task.id}`)
        .set(authHeader(member.token))
      expect(res.status).toBe(403)
    })

    it('OWNER/ADMIN can delete a task', async () => {
      const owner = await registerUser()
      const project = await createProject(owner.token)
      const board = await createBoard(owner.token, project.id)
      const task = await createTask(owner.token, project.id, board.id)
      const res = await api
        .delete(`/api/projects/${project.id}/boards/${board.id}/tasks/${task.id}`)
        .set(authHeader(owner.token))
      expect(res.status).toBe(200)
    })
  })

  describe('GET /.../tasks (pagination)', () => {
    it('rejects a negative page', async () => {
      const owner = await registerUser()
      const project = await createProject(owner.token)
      const board = await createBoard(owner.token, project.id)
      const res = await api
        .get(`/api/projects/${project.id}/boards/${board.id}/tasks`)
        .query({ page: '-1' })
        .set(authHeader(owner.token))
      expect(res.status).toBe(400)
    })

    it('rejects a limit above the maximum', async () => {
      const owner = await registerUser()
      const project = await createProject(owner.token)
      const board = await createBoard(owner.token, project.id)
      const res = await api
        .get(`/api/projects/${project.id}/boards/${board.id}/tasks`)
        .query({ limit: '10000' })
        .set(authHeader(owner.token))
      expect(res.status).toBe(400)
    })
  })
})
