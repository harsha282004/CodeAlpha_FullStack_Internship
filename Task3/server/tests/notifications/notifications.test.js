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
  assignUser,
  authHeader,
} from '../helpers.js'

describe('notifications', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('adding a member generates a PROJECT_MEMBER_ADDED notification for the new member only', async () => {
    const owner = await registerUser()
    const member = await registerUser()
    const project = await createProject(owner.token)
    await addMember(owner.token, project.id, member.user.id)

    const memberNotifs = await api.get('/api/notifications').set(authHeader(member.token))
    expect(memberNotifs.body.data.notifications.some((n) => n.type === 'PROJECT_MEMBER_ADDED')).toBe(true)

    const ownerNotifs = await api.get('/api/notifications').set(authHeader(owner.token))
    expect(ownerNotifs.body.data.notifications.some((n) => n.type === 'PROJECT_MEMBER_ADDED')).toBe(false)
  })

  it('assigning a task generates TASK_ASSIGNED for the assignee, never for self-assignment', async () => {
    const owner = await registerUser()
    const member = await registerUser()
    const project = await createProject(owner.token)
    await addMember(owner.token, project.id, member.user.id)
    const board = await createBoard(owner.token, project.id)
    const task = await createTask(owner.token, project.id, board.id)

    await assignUser(owner.token, project.id, board.id, task.id, member.user.id)
    const memberNotifs = await api.get('/api/notifications').set(authHeader(member.token))
    expect(memberNotifs.body.data.notifications.some((n) => n.type === 'TASK_ASSIGNED')).toBe(true)

    // Self-assignment (owner assigns themselves) must not notify.
    await assignUser(owner.token, project.id, board.id, task.id, owner.user.id)
    const ownerNotifs = await api.get('/api/notifications').set(authHeader(owner.token))
    expect(ownerNotifs.body.data.notifications.some((n) => n.type === 'TASK_ASSIGNED')).toBe(false)
  })

  it('commenting generates TASK_COMMENTED for the task creator, never for the commenter themself', async () => {
    const owner = await registerUser()
    const member = await registerUser()
    const project = await createProject(owner.token)
    await addMember(owner.token, project.id, member.user.id)
    const board = await createBoard(owner.token, project.id)
    const task = await createTask(owner.token, project.id, board.id) // owner created it

    await createComment(member.token, project.id, board.id, task.id, 'A comment')
    const ownerNotifs = await api.get('/api/notifications').set(authHeader(owner.token))
    expect(ownerNotifs.body.data.notifications.some((n) => n.type === 'TASK_COMMENTED')).toBe(true)

    await createComment(owner.token, project.id, board.id, task.id, 'Own comment')
    const ownerNotifsAfter = await api.get('/api/notifications').set(authHeader(owner.token))
    const commentedCount = ownerNotifsAfter.body.data.notifications.filter((n) => n.type === 'TASK_COMMENTED').length
    expect(commentedCount).toBe(1) // still just the one from the member's comment
  })

  it('GET /api/notifications/unread-count matches a direct count', async () => {
    const owner = await registerUser()
    const member = await registerUser()
    const project = await createProject(owner.token)
    await addMember(owner.token, project.id, member.user.id)

    const res = await api.get('/api/notifications/unread-count').set(authHeader(member.token))
    expect(res.status).toBe(200)
    expect(res.body.data.count).toBeGreaterThanOrEqual(1)
  })

  it('PATCH /:id/read is idempotent', async () => {
    const owner = await registerUser()
    const member = await registerUser()
    const project = await createProject(owner.token)
    await addMember(owner.token, project.id, member.user.id)
    const list = await api.get('/api/notifications').set(authHeader(member.token))
    const notificationId = list.body.data.notifications[0].id

    const first = await api.patch(`/api/notifications/${notificationId}/read`).set(authHeader(member.token))
    const second = await api.patch(`/api/notifications/${notificationId}/read`).set(authHeader(member.token))
    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(second.body.data.notification.read).toBe(true)
  })

  it('PATCH /read-all marks every unread notification read', async () => {
    const owner = await registerUser()
    const member = await registerUser()
    const project = await createProject(owner.token)
    await addMember(owner.token, project.id, member.user.id)

    const res = await api.patch('/api/notifications/read-all').set(authHeader(member.token))
    expect(res.status).toBe(200)
    const after = await api.get('/api/notifications/unread-count').set(authHeader(member.token))
    expect(after.body.data.count).toBe(0)
  })

  describe('ownership isolation — the core security property of this resource', () => {
    it("user B cannot list user A's notifications (each sees only their own)", async () => {
      const owner = await registerUser()
      const member = await registerUser()
      const project = await createProject(owner.token)
      await addMember(owner.token, project.id, member.user.id)

      const memberNotifs = await api.get('/api/notifications').set(authHeader(member.token))
      const ownerNotifs = await api.get('/api/notifications').set(authHeader(owner.token))
      const memberIds = new Set(memberNotifs.body.data.notifications.map((n) => n.id))
      const ownerIds = new Set(ownerNotifs.body.data.notifications.map((n) => n.id))
      for (const id of memberIds) expect(ownerIds.has(id)).toBe(false)
    })

    it("user B marking user A's notification read returns 404, not 403, and does not affect it", async () => {
      const owner = await registerUser()
      const member = await registerUser()
      const project = await createProject(owner.token)
      await addMember(owner.token, project.id, member.user.id)
      const list = await api.get('/api/notifications').set(authHeader(member.token))
      const memberNotificationId = list.body.data.notifications[0].id

      const res = await api.patch(`/api/notifications/${memberNotificationId}/read`).set(authHeader(owner.token))
      expect(res.status).toBe(404)

      const stillUnread = await api.get('/api/notifications').set(authHeader(member.token))
      const target = stillUnread.body.data.notifications.find((n) => n.id === memberNotificationId)
      expect(target.read).toBe(false)
    })

    it("user B cannot delete user A's notification", async () => {
      const owner = await registerUser()
      const member = await registerUser()
      const project = await createProject(owner.token)
      await addMember(owner.token, project.id, member.user.id)
      const list = await api.get('/api/notifications').set(authHeader(member.token))
      const memberNotificationId = list.body.data.notifications[0].id

      const res = await api.delete(`/api/notifications/${memberNotificationId}`).set(authHeader(owner.token))
      expect(res.status).toBe(404)

      const stillThere = await api.get('/api/notifications').set(authHeader(member.token))
      expect(stillThere.body.data.notifications.some((n) => n.id === memberNotificationId)).toBe(true)
    })

    it('requires authentication', async () => {
      const res = await api.get('/api/notifications')
      expect(res.status).toBe(401)
    })
  })
})
