import { describe, it, expect, beforeEach } from 'vitest'
import { api, resetDb, authHeader, buildTwoProjectFixture } from '../helpers.js'

// Phase 16.4 — IDOR / object access audit. Two fully independent projects
// (A and B), each with its own owner/member/board/task/comment, built by
// buildTwoProjectFixture(). Every test below asks the same question one
// resource at a time: can someone who belongs only to Project A reach
// Project B's equivalent resource, whether by its own URL or by substituting
// B's real id into an A-scoped URL?
describe('IDOR / cross-project isolation', () => {
  let fx

  beforeEach(async () => {
    await resetDb()
    fx = await buildTwoProjectFixture()
  })

  it("Project A's owner cannot access Project B's project detail", async () => {
    const res = await api.get(`/api/projects/${fx.projectB.id}`).set(authHeader(fx.ownerA.token))
    expect(res.status).toBe(403)
  })

  it("Project A's member cannot access Project B's project detail", async () => {
    const res = await api.get(`/api/projects/${fx.projectB.id}`).set(authHeader(fx.memberA.token))
    expect(res.status).toBe(403)
  })

  it("Project A's owner cannot list Project B's boards", async () => {
    const res = await api.get(`/api/projects/${fx.projectB.id}/boards`).set(authHeader(fx.ownerA.token))
    expect(res.status).toBe(403)
  })

  it("Project B's board is unreachable through Project A's URL, even with B's real board id substituted", async () => {
    const res = await api
      .get(`/api/projects/${fx.projectA.id}/boards/${fx.boardB.id}`)
      .set(authHeader(fx.ownerA.token))
    expect(res.status).toBe(404)
  })

  it("Project B's task is unreachable through Project A's project+board URL with B's real task id substituted", async () => {
    const res = await api
      .get(`/api/projects/${fx.projectA.id}/boards/${fx.boardA.id}/tasks/${fx.taskB.id}`)
      .set(authHeader(fx.ownerA.token))
    expect(res.status).toBe(404)
  })

  it("Project A's owner cannot access Project B's task directly through B's own full URL either (not a member)", async () => {
    const res = await api
      .get(`/api/projects/${fx.projectB.id}/boards/${fx.boardB.id}/tasks/${fx.taskB.id}`)
      .set(authHeader(fx.ownerA.token))
    expect(res.status).toBe(403)
  })

  it("Project B's comment is unreachable through Project A's task URL with B's real comment id substituted", async () => {
    const res = await api
      .get(`/api/projects/${fx.projectA.id}/boards/${fx.boardA.id}/tasks/${fx.taskA.id}/comments/${fx.commentB.id}`)
      .set(authHeader(fx.ownerA.token))
    expect(res.status).toBe(404)
  })

  it("Project A's owner cannot list Project B's task assignees", async () => {
    const res = await api
      .get(`/api/projects/${fx.projectB.id}/boards/${fx.boardB.id}/tasks/${fx.taskB.id}/assignees`)
      .set(authHeader(fx.ownerA.token))
    expect(res.status).toBe(403)
  })

  it("Project A's owner cannot assign themselves to Project B's task", async () => {
    const res = await api
      .post(`/api/projects/${fx.projectB.id}/boards/${fx.boardB.id}/tasks/${fx.taskB.id}/assignees`)
      .set(authHeader(fx.ownerA.token))
      .send({ userId: fx.ownerA.user.id })
    expect(res.status).toBe(403)
  })

  it("Project A's owner cannot delete Project B's task", async () => {
    const res = await api
      .delete(`/api/projects/${fx.projectB.id}/boards/${fx.boardB.id}/tasks/${fx.taskB.id}`)
      .set(authHeader(fx.ownerA.token))
    expect(res.status).toBe(403)
  })

  it("Project A's owner cannot delete Project B's board", async () => {
    const res = await api
      .delete(`/api/projects/${fx.projectB.id}/boards/${fx.boardB.id}`)
      .set(authHeader(fx.ownerA.token))
    expect(res.status).toBe(403)
  })

  it("Project A's owner cannot delete Project B's comment", async () => {
    const res = await api
      .delete(`/api/projects/${fx.projectB.id}/boards/${fx.boardB.id}/tasks/${fx.taskB.id}/comments/${fx.commentB.id}`)
      .set(authHeader(fx.ownerA.token))
    expect(res.status).toBe(403)
  })

  it("Project A's owner cannot edit Project B's comment", async () => {
    const res = await api
      .patch(`/api/projects/${fx.projectB.id}/boards/${fx.boardB.id}/tasks/${fx.taskB.id}/comments/${fx.commentB.id}`)
      .set(authHeader(fx.ownerA.token))
      .send({ content: 'Hijacked' })
    expect(res.status).toBe(403)
  })

  it("Project A's owner cannot list or modify Project B's members", async () => {
    const list = await api.get(`/api/projects/${fx.projectB.id}/members`).set(authHeader(fx.ownerA.token))
    expect(list.status).toBe(403)

    const add = await api
      .post(`/api/projects/${fx.projectB.id}/members`)
      .set(authHeader(fx.ownerA.token))
      .send({ userId: fx.outsider.user.id })
    expect(add.status).toBe(403)

    const remove = await api
      .delete(`/api/projects/${fx.projectB.id}/members/${fx.memberB.user.id}`)
      .set(authHeader(fx.ownerA.token))
    expect(remove.status).toBe(403)

    const roleChange = await api
      .patch(`/api/projects/${fx.projectB.id}/members/${fx.memberB.user.id}`)
      .set(authHeader(fx.ownerA.token))
      .send({ role: 'ADMIN' })
    expect(roleChange.status).toBe(403)
  })

  it('an outsider (member of neither project) is rejected from both', async () => {
    const a = await api.get(`/api/projects/${fx.projectA.id}`).set(authHeader(fx.outsider.token))
    const b = await api.get(`/api/projects/${fx.projectB.id}`).set(authHeader(fx.outsider.token))
    expect(a.status).toBe(403)
    expect(b.status).toBe(403)
  })

  describe('notifications', () => {
    it("Project B's owner cannot see, read, or delete Project A's notifications", async () => {
      // memberA has at least one PROJECT_MEMBER_ADDED notification from setup.
      const listA = await api.get('/api/notifications').set(authHeader(fx.memberA.token))
      const notifId = listA.body.data.notifications[0].id

      const readAttempt = await api.patch(`/api/notifications/${notifId}/read`).set(authHeader(fx.ownerB.token))
      expect(readAttempt.status).toBe(404)

      const deleteAttempt = await api.delete(`/api/notifications/${notifId}`).set(authHeader(fx.ownerB.token))
      expect(deleteAttempt.status).toBe(404)

      const stillThere = await api.get('/api/notifications').set(authHeader(fx.memberA.token))
      expect(stillThere.body.data.notifications.some((n) => n.id === notifId)).toBe(true)
    })
  })
})
