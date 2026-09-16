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

describe('comments', () => {
  beforeEach(async () => {
    await resetDb()
  })

  describe('POST /.../comments', () => {
    it('any member can create a comment; authorId is always the caller', async () => {
      const owner = await registerUser()
      const member = await registerUser()
      const project = await createProject(owner.token)
      await addMember(owner.token, project.id, member.user.id)
      const board = await createBoard(owner.token, project.id)
      const task = await createTask(owner.token, project.id, board.id)

      const comment = await createComment(member.token, project.id, board.id, task.id, 'Hello')
      expect(comment.author.id).toBe(member.user.id)
    })

    it('rejects an authorId spoof attempt in the body', async () => {
      const owner = await registerUser()
      const other = await registerUser()
      const project = await createProject(owner.token)
      const board = await createBoard(owner.token, project.id)
      const task = await createTask(owner.token, project.id, board.id)
      const res = await api
        .post(`/api/projects/${project.id}/boards/${board.id}/tasks/${task.id}/comments`)
        .set(authHeader(owner.token))
        .send({ content: 'Spoofed', authorId: other.user.id })
      expect(res.status).toBe(400)
    })

    it('rejects an empty/whitespace-only content', async () => {
      const owner = await registerUser()
      const project = await createProject(owner.token)
      const board = await createBoard(owner.token, project.id)
      const task = await createTask(owner.token, project.id, board.id)
      const res = await api
        .post(`/api/projects/${project.id}/boards/${board.id}/tasks/${task.id}/comments`)
        .set(authHeader(owner.token))
        .send({ content: '   ' })
      expect(res.status).toBe(400)
    })

    it('rejects content over 4000 characters', async () => {
      const owner = await registerUser()
      const project = await createProject(owner.token)
      const board = await createBoard(owner.token, project.id)
      const task = await createTask(owner.token, project.id, board.id)
      const res = await api
        .post(`/api/projects/${project.id}/boards/${board.id}/tasks/${task.id}/comments`)
        .set(authHeader(owner.token))
        .send({ content: 'x'.repeat(4001) })
      expect(res.status).toBe(400)
    })

    it('rejects a non-member', async () => {
      const owner = await registerUser()
      const outsider = await registerUser()
      const project = await createProject(owner.token)
      const board = await createBoard(owner.token, project.id)
      const task = await createTask(owner.token, project.id, board.id)
      const res = await api
        .post(`/api/projects/${project.id}/boards/${board.id}/tasks/${task.id}/comments`)
        .set(authHeader(outsider.token))
        .send({ content: 'Nope' })
      expect(res.status).toBe(403)
    })
  })

  describe('GET /.../comments', () => {
    it('lists comments oldest-first', async () => {
      const owner = await registerUser()
      const project = await createProject(owner.token)
      const board = await createBoard(owner.token, project.id)
      const task = await createTask(owner.token, project.id, board.id)
      await createComment(owner.token, project.id, board.id, task.id, 'First')
      await createComment(owner.token, project.id, board.id, task.id, 'Second')

      const res = await api
        .get(`/api/projects/${project.id}/boards/${board.id}/tasks/${task.id}/comments`)
        .set(authHeader(owner.token))
      expect(res.body.data.comments.map((c) => c.content)).toEqual(['First', 'Second'])
    })
  })

  describe('PATCH /.../comments/:commentId — author-only', () => {
    it('the author can edit their own comment', async () => {
      const owner = await registerUser()
      const project = await createProject(owner.token)
      const board = await createBoard(owner.token, project.id)
      const task = await createTask(owner.token, project.id, board.id)
      const comment = await createComment(owner.token, project.id, board.id, task.id, 'Original')

      const res = await api
        .patch(`/api/projects/${project.id}/boards/${board.id}/tasks/${task.id}/comments/${comment.id}`)
        .set(authHeader(owner.token))
        .send({ content: 'Edited' })
      expect(res.status).toBe(200)
      expect(res.body.data.comment.content).toBe('Edited')
    })

    it('OWNER/ADMIN cannot edit someone else\'s comment (deliberate exception to the usual role model)', async () => {
      const owner = await registerUser()
      const member = await registerUser()
      const project = await createProject(owner.token)
      await addMember(owner.token, project.id, member.user.id)
      const board = await createBoard(owner.token, project.id)
      const task = await createTask(owner.token, project.id, board.id)
      const comment = await createComment(member.token, project.id, board.id, task.id, 'Member comment')

      const res = await api
        .patch(`/api/projects/${project.id}/boards/${board.id}/tasks/${task.id}/comments/${comment.id}`)
        .set(authHeader(owner.token))
        .send({ content: 'Owner edit attempt' })
      expect(res.status).toBe(403)
    })

    it('a plain member cannot edit someone else\'s comment', async () => {
      const owner = await registerUser()
      const memberOne = await registerUser()
      const memberTwo = await registerUser()
      const project = await createProject(owner.token)
      await addMember(owner.token, project.id, memberOne.user.id)
      await addMember(owner.token, project.id, memberTwo.user.id)
      const board = await createBoard(owner.token, project.id)
      const task = await createTask(owner.token, project.id, board.id)
      const comment = await createComment(memberOne.token, project.id, board.id, task.id, 'Comment')

      const res = await api
        .patch(`/api/projects/${project.id}/boards/${board.id}/tasks/${task.id}/comments/${comment.id}`)
        .set(authHeader(memberTwo.token))
        .send({ content: 'Hijack attempt' })
      expect(res.status).toBe(403)
    })
  })

  describe('DELETE /.../comments/:commentId — author or moderator', () => {
    it('the author can delete their own comment', async () => {
      const owner = await registerUser()
      const project = await createProject(owner.token)
      const board = await createBoard(owner.token, project.id)
      const task = await createTask(owner.token, project.id, board.id)
      const comment = await createComment(owner.token, project.id, board.id, task.id)

      const res = await api
        .delete(`/api/projects/${project.id}/boards/${board.id}/tasks/${task.id}/comments/${comment.id}`)
        .set(authHeader(owner.token))
      expect(res.status).toBe(200)
    })

    it('OWNER can delete a member\'s comment (moderation)', async () => {
      const owner = await registerUser()
      const member = await registerUser()
      const project = await createProject(owner.token)
      await addMember(owner.token, project.id, member.user.id)
      const board = await createBoard(owner.token, project.id)
      const task = await createTask(owner.token, project.id, board.id)
      const comment = await createComment(member.token, project.id, board.id, task.id)

      const res = await api
        .delete(`/api/projects/${project.id}/boards/${board.id}/tasks/${task.id}/comments/${comment.id}`)
        .set(authHeader(owner.token))
      expect(res.status).toBe(200)
    })

    it('a plain member cannot delete someone else\'s comment', async () => {
      const owner = await registerUser()
      const memberOne = await registerUser()
      const memberTwo = await registerUser()
      const project = await createProject(owner.token)
      await addMember(owner.token, project.id, memberOne.user.id)
      await addMember(owner.token, project.id, memberTwo.user.id)
      const board = await createBoard(owner.token, project.id)
      const task = await createTask(owner.token, project.id, board.id)
      const comment = await createComment(memberOne.token, project.id, board.id, task.id)

      const res = await api
        .delete(`/api/projects/${project.id}/boards/${board.id}/tasks/${task.id}/comments/${comment.id}`)
        .set(authHeader(memberTwo.token))
      expect(res.status).toBe(403)
    })
  })

  describe('hierarchy isolation', () => {
    it('a comment requested through a sibling task is 404', async () => {
      const owner = await registerUser()
      const project = await createProject(owner.token)
      const board = await createBoard(owner.token, project.id)
      const taskOne = await createTask(owner.token, project.id, board.id, { title: 'One' })
      const taskTwo = await createTask(owner.token, project.id, board.id, { title: 'Two' })
      const comment = await createComment(owner.token, project.id, board.id, taskOne.id)

      const res = await api
        .get(`/api/projects/${project.id}/boards/${board.id}/tasks/${taskTwo.id}/comments/${comment.id}`)
        .set(authHeader(owner.token))
      expect(res.status).toBe(404)
    })
  })
})
