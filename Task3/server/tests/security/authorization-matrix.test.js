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

// Phase 17.3 — an explicit, automated OWNER/ADMIN/MEMBER/NON-MEMBER/
// UNAUTHENTICATED matrix. Read endpoints are checked directly in a data
// table (safe to reuse across five callers); write endpoints are checked
// per-role against a resource created fresh for that check, since a delete
// or role change can't be repeated against the same row.
describe('authorization matrix', () => {
  let owner
  let admin
  let member
  let outsider
  let project
  let board
  let task
  let comment

  beforeEach(async () => {
    await resetDb()
    owner = await registerUser({ name: 'Matrix Owner' })
    admin = await registerUser({ name: 'Matrix Admin' })
    member = await registerUser({ name: 'Matrix Member' })
    outsider = await registerUser({ name: 'Matrix Outsider' })

    project = await createProject(owner.token, { name: 'Matrix Project' })
    await addMember(owner.token, project.id, admin.user.id, 'ADMIN')
    await addMember(owner.token, project.id, member.user.id)
    board = await createBoard(owner.token, project.id)
    task = await createTask(owner.token, project.id, board.id)
    comment = await createComment(owner.token, project.id, board.id, task.id)
  })

  // path is a function of the fixture above so it always points at a real,
  // freshly-created resource.
  const READ_ENDPOINTS = [
    ['project detail', () => `/api/projects/${project.id}`],
    ['project members', () => `/api/projects/${project.id}/members`],
    ['boards list', () => `/api/projects/${project.id}/boards`],
    ['board detail', () => `/api/projects/${project.id}/boards/${board.id}`],
    ['tasks list', () => `/api/projects/${project.id}/boards/${board.id}/tasks`],
    ['task detail', () => `/api/projects/${project.id}/boards/${board.id}/tasks/${task.id}`],
    ['assignees list', () => `/api/projects/${project.id}/boards/${board.id}/tasks/${task.id}/assignees`],
    ['comments list', () => `/api/projects/${project.id}/boards/${board.id}/tasks/${task.id}/comments`],
    ['comment detail', () => `/api/projects/${project.id}/boards/${board.id}/tasks/${task.id}/comments/${comment.id}`],
  ]

  describe.each(READ_ENDPOINTS)('GET %s', (_label, pathFn) => {
    it('OWNER -> 200', async () => {
      const res = await api.get(pathFn()).set(authHeader(owner.token))
      expect(res.status).toBe(200)
    })
    it('ADMIN -> 200', async () => {
      const res = await api.get(pathFn()).set(authHeader(admin.token))
      expect(res.status).toBe(200)
    })
    it('MEMBER -> 200', async () => {
      const res = await api.get(pathFn()).set(authHeader(member.token))
      expect(res.status).toBe(200)
    })
    it('NON-MEMBER -> 403', async () => {
      const res = await api.get(pathFn()).set(authHeader(outsider.token))
      expect(res.status).toBe(403)
    })
    it('UNAUTHENTICATED -> 401', async () => {
      const res = await api.get(pathFn())
      expect(res.status).toBe(401)
    })
  })

  // Each row: [label, minimum roles that succeed, factory that performs the
  // action as a given caller against a freshly-created sub-resource so
  // repeating it for every role in the matrix is safe].
  const WRITE_CASES = [
    {
      label: 'PATCH project (rename)',
      allowed: ['OWNER', 'ADMIN'],
      run: (callerToken) => api.patch(`/api/projects/${project.id}`).set(authHeader(callerToken)).send({ name: 'Renamed' }),
    },
    {
      label: 'DELETE project',
      allowed: ['OWNER'],
      // Uses its own fresh project per call, since delete is one-shot.
      run: async (callerToken, roleLabel) => {
        const p = await createProject(owner.token, { name: `Delete target ${roleLabel}` })
        if (roleLabel === 'ADMIN') await addMember(owner.token, p.id, admin.user.id, 'ADMIN')
        if (roleLabel === 'MEMBER') await addMember(owner.token, p.id, member.user.id)
        return api.delete(`/api/projects/${p.id}`).set(authHeader(callerToken))
      },
    },
    {
      label: 'POST board (create)',
      allowed: ['OWNER', 'ADMIN', 'MEMBER'],
      run: (callerToken) => api.post(`/api/projects/${project.id}/boards`).set(authHeader(callerToken)).send({ name: 'New Board' }),
    },
    {
      label: 'PATCH board (rename)',
      allowed: ['OWNER', 'ADMIN'],
      run: async (callerToken) => {
        const b = await createBoard(owner.token, project.id, { name: 'Rename target' })
        return api.patch(`/api/projects/${project.id}/boards/${b.id}`).set(authHeader(callerToken)).send({ name: 'Renamed' })
      },
    },
    {
      label: 'DELETE board',
      allowed: ['OWNER', 'ADMIN'],
      run: async (callerToken) => {
        const b = await createBoard(owner.token, project.id, { name: 'Delete target' })
        return api.delete(`/api/projects/${project.id}/boards/${b.id}`).set(authHeader(callerToken))
      },
    },
    {
      label: 'POST task (create)',
      allowed: ['OWNER', 'ADMIN', 'MEMBER'],
      run: (callerToken) =>
        api.post(`/api/projects/${project.id}/boards/${board.id}/tasks`).set(authHeader(callerToken)).send({ title: 'New Task' }),
    },
    {
      label: 'PATCH task (update)',
      allowed: ['OWNER', 'ADMIN', 'MEMBER'],
      run: async (callerToken) => {
        const t = await createTask(owner.token, project.id, board.id, { title: 'Update target' })
        return api
          .patch(`/api/projects/${project.id}/boards/${board.id}/tasks/${t.id}`)
          .set(authHeader(callerToken))
          .send({ title: 'Updated' })
      },
    },
    {
      label: 'DELETE task',
      allowed: ['OWNER', 'ADMIN'],
      run: async (callerToken) => {
        const t = await createTask(owner.token, project.id, board.id, { title: 'Delete target' })
        return api.delete(`/api/projects/${project.id}/boards/${board.id}/tasks/${t.id}`).set(authHeader(callerToken))
      },
    },
    {
      label: 'POST assignee (assign)',
      allowed: ['OWNER', 'ADMIN'],
      run: async (callerToken) => {
        const t = await createTask(owner.token, project.id, board.id, { title: 'Assign target' })
        return api
          .post(`/api/projects/${project.id}/boards/${board.id}/tasks/${t.id}/assignees`)
          .set(authHeader(callerToken))
          .send({ userId: member.user.id })
      },
    },
    {
      label: 'POST comment (create)',
      allowed: ['OWNER', 'ADMIN', 'MEMBER'],
      run: (callerToken) =>
        api
          .post(`/api/projects/${project.id}/boards/${board.id}/tasks/${task.id}/comments`)
          .set(authHeader(callerToken))
          .send({ content: 'Matrix comment' }),
    },
    {
      label: 'POST member (add)',
      allowed: ['OWNER', 'ADMIN'],
      run: async (callerToken) => {
        const newUser = await registerUser()
        return api.post(`/api/projects/${project.id}/members`).set(authHeader(callerToken)).send({ userId: newUser.user.id })
      },
    },
    {
      label: 'PATCH member role',
      allowed: ['OWNER'],
      run: async (callerToken) => {
        const newUser = await registerUser()
        await addMember(owner.token, project.id, newUser.user.id)
        return api
          .patch(`/api/projects/${project.id}/members/${newUser.user.id}`)
          .set(authHeader(callerToken))
          .send({ role: 'ADMIN' })
      },
    },
    {
      label: 'DELETE member (remove)',
      allowed: ['OWNER', 'ADMIN'],
      run: async (callerToken) => {
        const newUser = await registerUser()
        await addMember(owner.token, project.id, newUser.user.id)
        return api.delete(`/api/projects/${project.id}/members/${newUser.user.id}`).set(authHeader(callerToken))
      },
    },
  ]

  const ROLE_TOKENS = () => ({ OWNER: owner.token, ADMIN: admin.token, MEMBER: member.token })

  describe.each(WRITE_CASES)('$label', ({ allowed, run }) => {
    it.each(['OWNER', 'ADMIN', 'MEMBER'])('%s', async (roleLabel) => {
      const token = ROLE_TOKENS()[roleLabel]
      const res = await run(token, roleLabel)
      if (allowed.includes(roleLabel)) {
        expect([200, 201]).toContain(res.status)
      } else {
        expect(res.status).toBe(403)
      }
    })

    it('NON-MEMBER -> 403', async () => {
      const res = await run(outsider.token, 'NON-MEMBER')
      expect(res.status).toBe(403)
    })
  })
})
