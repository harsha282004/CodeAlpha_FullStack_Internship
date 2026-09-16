import { describe, it, expect, beforeEach } from 'vitest'
import {
  api,
  resetDb,
  registerUser,
  createProject,
  createBoard,
  createTask,
  addMember,
  assignUser,
  authHeader,
} from '../helpers.js'

describe('assignments', () => {
  beforeEach(async () => {
    await resetDb()
  })

  describe('POST /.../assignees', () => {
    it('OWNER/ADMIN can assign an existing project member', async () => {
      const owner = await registerUser()
      const member = await registerUser()
      const project = await createProject(owner.token)
      await addMember(owner.token, project.id, member.user.id)
      const board = await createBoard(owner.token, project.id)
      const task = await createTask(owner.token, project.id, board.id)
      const res = await assignUser(owner.token, project.id, board.id, task.id, member.user.id)
      expect(res.status).toBe(201)
    })

    it('MEMBER cannot assign (assignment management is OWNER/ADMIN only)', async () => {
      const owner = await registerUser()
      const memberOne = await registerUser()
      const memberTwo = await registerUser()
      const project = await createProject(owner.token)
      await addMember(owner.token, project.id, memberOne.user.id)
      await addMember(owner.token, project.id, memberTwo.user.id)
      const board = await createBoard(owner.token, project.id)
      const task = await createTask(owner.token, project.id, board.id)
      const res = await assignUser(memberOne.token, project.id, board.id, task.id, memberTwo.user.id)
      expect(res.status).toBe(403)
    })

    it('rejects assigning a user who is not a project member', async () => {
      const owner = await registerUser()
      const nonMember = await registerUser()
      const project = await createProject(owner.token)
      const board = await createBoard(owner.token, project.id)
      const task = await createTask(owner.token, project.id, board.id)
      const res = await assignUser(owner.token, project.id, board.id, task.id, nonMember.user.id)
      expect(res.status).toBe(404)
    })

    it('rejects a duplicate assignment (409)', async () => {
      const owner = await registerUser()
      const member = await registerUser()
      const project = await createProject(owner.token)
      await addMember(owner.token, project.id, member.user.id)
      const board = await createBoard(owner.token, project.id)
      const task = await createTask(owner.token, project.id, board.id)
      await assignUser(owner.token, project.id, board.id, task.id, member.user.id)
      const res = await assignUser(owner.token, project.id, board.id, task.id, member.user.id)
      expect(res.status).toBe(409)
    })

    it("a user who is only a member of a DIFFERENT project cannot be assigned (cross-project isolation)", async () => {
      const ownerA = await registerUser()
      const ownerB = await registerUser()
      const memberOfB = await registerUser()
      const projectA = await createProject(ownerA.token)
      const projectB = await createProject(ownerB.token)
      await addMember(ownerB.token, projectB.id, memberOfB.user.id)
      const boardA = await createBoard(ownerA.token, projectA.id)
      const taskA = await createTask(ownerA.token, projectA.id, boardA.id)

      const res = await assignUser(ownerA.token, projectA.id, boardA.id, taskA.id, memberOfB.user.id)
      expect(res.status).toBe(404)
    })
  })

  describe('GET /.../assignees', () => {
    it('lists assignees with safe fields only', async () => {
      const owner = await registerUser()
      const member = await registerUser()
      const project = await createProject(owner.token)
      await addMember(owner.token, project.id, member.user.id)
      const board = await createBoard(owner.token, project.id)
      const task = await createTask(owner.token, project.id, board.id)
      await assignUser(owner.token, project.id, board.id, task.id, member.user.id)

      const res = await api
        .get(`/api/projects/${project.id}/boards/${board.id}/tasks/${task.id}/assignees`)
        .set(authHeader(owner.token))
      expect(res.status).toBe(200)
      expect(res.body.data.assignees).toHaveLength(1)
      expect(JSON.stringify(res.body)).not.toContain('email')
    })
  })

  describe('GET /.../assignees/:userId (status check)', () => {
    it('200 when assigned, 404 when not', async () => {
      const owner = await registerUser()
      const member = await registerUser()
      const project = await createProject(owner.token)
      await addMember(owner.token, project.id, member.user.id)
      const board = await createBoard(owner.token, project.id)
      const task = await createTask(owner.token, project.id, board.id)
      await assignUser(owner.token, project.id, board.id, task.id, member.user.id)

      const assigned = await api
        .get(`/api/projects/${project.id}/boards/${board.id}/tasks/${task.id}/assignees/${member.user.id}`)
        .set(authHeader(owner.token))
      expect(assigned.status).toBe(200)

      // The owner was never explicitly assigned to this task.
      const notAssigned = await api
        .get(`/api/projects/${project.id}/boards/${board.id}/tasks/${task.id}/assignees/${owner.user.id}`)
        .set(authHeader(owner.token))
      expect(notAssigned.status).toBe(404)
    })
  })

  describe('DELETE /.../assignees/:userId', () => {
    it('OWNER/ADMIN can remove an assignee (only the TaskAssignee row, nothing else)', async () => {
      const owner = await registerUser()
      const member = await registerUser()
      const project = await createProject(owner.token)
      await addMember(owner.token, project.id, member.user.id)
      const board = await createBoard(owner.token, project.id)
      const task = await createTask(owner.token, project.id, board.id)
      await assignUser(owner.token, project.id, board.id, task.id, member.user.id)

      const res = await api
        .delete(`/api/projects/${project.id}/boards/${board.id}/tasks/${task.id}/assignees/${member.user.id}`)
        .set(authHeader(owner.token))
      expect(res.status).toBe(200)

      // member is still a project member afterward — only the assignment was removed
      const membersRes = await api.get(`/api/projects/${project.id}/members`).set(authHeader(owner.token))
      expect(membersRes.body.data.members.some((m) => m.id === member.user.id)).toBe(true)
    })

    it('MEMBER cannot remove an assignee', async () => {
      const owner = await registerUser()
      const member = await registerUser()
      const project = await createProject(owner.token)
      await addMember(owner.token, project.id, member.user.id)
      const board = await createBoard(owner.token, project.id)
      const task = await createTask(owner.token, project.id, board.id)
      await assignUser(owner.token, project.id, board.id, task.id, member.user.id)

      const res = await api
        .delete(`/api/projects/${project.id}/boards/${board.id}/tasks/${task.id}/assignees/${member.user.id}`)
        .set(authHeader(member.token))
      expect(res.status).toBe(403)
    })
  })
})
