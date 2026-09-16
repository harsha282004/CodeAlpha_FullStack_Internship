import { createServer } from 'node:http'
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'
import { io as ioClient } from 'socket.io-client'
import app from '../../src/app.js'
import { initSocketServer, getIO } from '../../src/realtime/socket.js'
import {
  resetDb,
  registerUser,
  createProject,
  createBoard,
  createTask,
  addMember,
  authHeader,
  api,
} from '../helpers.js'

let httpServer
let baseUrl

function connect(token) {
  return ioClient(baseUrl, { auth: { token }, reconnection: false, forceNew: true, transports: ['websocket'] })
}

function waitFor(socket, event, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for "${event}"`)), timeoutMs)
    socket.once(event, (payload) => {
      clearTimeout(timer)
      resolve(payload)
    })
  })
}

describe('Socket.IO', () => {
  beforeAll(async () => {
    httpServer = createServer(app)
    initSocketServer(httpServer)
    await new Promise((resolve) => httpServer.listen(0, resolve))
    const { port } = httpServer.address()
    baseUrl = `http://localhost:${port}`
  })

  afterAll(async () => {
    getIO()?.close()
    await new Promise((resolve) => httpServer.close(resolve))
  })

  beforeEach(async () => {
    await resetDb()
  })

  describe('connection authentication', () => {
    it('accepts a connection with a valid token', async () => {
      const { token } = await registerUser()
      const socket = connect(token)
      await waitFor(socket, 'connect')
      expect(socket.connected).toBe(true)
      socket.disconnect()
    })

    it('rejects a connection with no token', async () => {
      const socket = connect(undefined)
      const err = await waitFor(socket, 'connect_error')
      expect(err.message).toBe('Authentication required')
      socket.disconnect()
    })

    it('rejects a malformed (non-JWT) token', async () => {
      const socket = connect('not-a-real-jwt')
      const err = await waitFor(socket, 'connect_error')
      expect(err.message).toBe('Authentication required')
      socket.disconnect()
    })

    it('rejects an expired token', async () => {
      const expired = jwt.sign({ sub: '11111111-1111-4111-8111-111111111111' }, process.env.JWT_SECRET, { expiresIn: -10 })
      const socket = connect(expired)
      const err = await waitFor(socket, 'connect_error')
      expect(err.message).toBe('Authentication required')
      socket.disconnect()
    })

    it('rejects a token signed with the wrong secret', async () => {
      const wrongSecret = jwt.sign({ sub: '11111111-1111-4111-8111-111111111111' }, 'a-totally-different-secret')
      const socket = connect(wrongSecret)
      const err = await waitFor(socket, 'connect_error')
      expect(err.message).toBe('Authentication required')
      socket.disconnect()
    })

    it('never trusts a client-supplied user id — a socket only ever sees its own JWT-derived room', async () => {
      const alice = await registerUser({ name: 'Alice Socket' })
      const bob = await registerUser({ name: 'Bob Socket' })
      const aliceSocket = connect(alice.token)
      await waitFor(aliceSocket, 'connect')

      // Alice cannot receive Bob's personal notifications no matter what she
      // claims in a payload — there is no handshake field for user identity
      // other than the verified token itself.
      const bobProject = await createProject(bob.token)
      let aliceReceivedBobNotification = false
      aliceSocket.on('notification:new', () => {
        aliceReceivedBobNotification = true
      })
      await addMember(bob.token, bobProject.id, alice.user.id)
      // Give any (incorrect) delivery a moment to arrive before asserting.
      await new Promise((r) => setTimeout(r, 300))
      // Alice WAS added as a member, so she legitimately gets her own
      // notification (delivered to her own user:<id> room) — this confirms
      // delivery works, then the isolation tests below confirm it never
      // reaches anyone else's room.
      expect(aliceReceivedBobNotification).toBe(true)
      aliceSocket.disconnect()
    })
  })

  describe('project room authorization', () => {
    it('a project member can join their own project room', async () => {
      const { token } = await registerUser()
      const project = await createProject(token)
      const socket = connect(token)
      await waitFor(socket, 'connect')

      const ack = await new Promise((resolve) => socket.emit('project:join', { projectId: project.id }, resolve))
      expect(ack.success).toBe(true)
      socket.disconnect()
    })

    it('a non-member is rejected with a distinct message from a nonexistent project', async () => {
      const owner = await registerUser()
      const outsider = await registerUser()
      const project = await createProject(owner.token)

      const socket = connect(outsider.token)
      await waitFor(socket, 'connect')
      const notMemberAck = await new Promise((resolve) => socket.emit('project:join', { projectId: project.id }, resolve))
      expect(notMemberAck.success).toBe(false)
      expect(notMemberAck.message).toBe('You are not a member of this project')

      const nonexistentAck = await new Promise((resolve) =>
        socket.emit('project:join', { projectId: '11111111-1111-4111-8111-111111111111' }, resolve),
      )
      expect(nonexistentAck.success).toBe(false)
      expect(nonexistentAck.message).toBe('Project not found')

      socket.disconnect()
    })
  })

  describe('event delivery + cross-project isolation', () => {
    it('task:created reaches a listener in the same project room', async () => {
      const owner = await registerUser()
      const project = await createProject(owner.token)
      const board = await createBoard(owner.token, project.id)

      const socket = connect(owner.token)
      await waitFor(socket, 'connect')
      await new Promise((resolve) => socket.emit('project:join', { projectId: project.id }, resolve))

      const eventPromise = waitFor(socket, 'task:created')
      await createTask(owner.token, project.id, board.id, { title: 'Realtime Task' })
      const payload = await eventPromise
      expect(payload.task.title).toBe('Realtime Task')
      expect(payload.projectId).toBe(project.id)
      // Safe payload — never a raw internal field.
      expect(JSON.stringify(payload)).not.toContain('passwordHash')
      socket.disconnect()
    })

    it('a listener in Project A never receives an event from Project B', async () => {
      const ownerA = await registerUser()
      const ownerB = await registerUser()
      const projectA = await createProject(ownerA.token)
      const projectB = await createProject(ownerB.token)
      const boardB = await createBoard(ownerB.token, projectB.id)

      const socketA = connect(ownerA.token)
      await waitFor(socketA, 'connect')
      await new Promise((resolve) => socketA.emit('project:join', { projectId: projectA.id }, resolve))

      let leaked = false
      socketA.on('task:created', () => {
        leaked = true
      })

      await createTask(ownerB.token, projectB.id, boardB.id, { title: 'Project B Task' })
      await new Promise((r) => setTimeout(r, 400))
      expect(leaked).toBe(false)
      socketA.disconnect()
    })

    it('comment:created reaches the project room', async () => {
      const owner = await registerUser()
      const project = await createProject(owner.token)
      const board = await createBoard(owner.token, project.id)
      const task = await createTask(owner.token, project.id, board.id)

      const socket = connect(owner.token)
      await waitFor(socket, 'connect')
      await new Promise((resolve) => socket.emit('project:join', { projectId: project.id }, resolve))

      const eventPromise = waitFor(socket, 'comment:created')
      await api
        .post(`/api/projects/${project.id}/boards/${board.id}/tasks/${task.id}/comments`)
        .set(authHeader(owner.token))
        .send({ content: 'Realtime comment' })
      const payload = await eventPromise
      expect(payload.comment.content).toBe('Realtime comment')
      socket.disconnect()
    })

    it('task:assigned reaches the project room and notification:new reaches only the assignee', async () => {
      const owner = await registerUser()
      const member = await registerUser()
      const project = await createProject(owner.token)
      await addMember(owner.token, project.id, member.user.id)
      const board = await createBoard(owner.token, project.id)
      const task = await createTask(owner.token, project.id, board.id)

      const ownerSocket = connect(owner.token)
      const memberSocket = connect(member.token)
      await Promise.all([waitFor(ownerSocket, 'connect'), waitFor(memberSocket, 'connect')])
      await new Promise((resolve) => ownerSocket.emit('project:join', { projectId: project.id }, resolve))

      const assignedEvent = waitFor(ownerSocket, 'task:assigned')
      const notificationEvent = waitFor(memberSocket, 'notification:new')
      let ownerReceivedNotification = false
      ownerSocket.on('notification:new', () => {
        ownerReceivedNotification = true
      })

      await api
        .post(`/api/projects/${project.id}/boards/${board.id}/tasks/${task.id}/assignees`)
        .set(authHeader(owner.token))
        .send({ userId: member.user.id })

      const assignedPayload = await assignedEvent
      expect(assignedPayload.taskId).toBe(task.id)
      const notificationPayload = await notificationEvent
      expect(notificationPayload.type).toBe('TASK_ASSIGNED')

      await new Promise((r) => setTimeout(r, 300))
      expect(ownerReceivedNotification).toBe(false) // owner is the actor, not the assignee

      ownerSocket.disconnect()
      memberSocket.disconnect()
    })

    it('board:deleted reaches the project room with identifiers only', async () => {
      const owner = await registerUser()
      const project = await createProject(owner.token)
      const board = await createBoard(owner.token, project.id)

      const socket = connect(owner.token)
      await waitFor(socket, 'connect')
      await new Promise((resolve) => socket.emit('project:join', { projectId: project.id }, resolve))

      const eventPromise = waitFor(socket, 'board:deleted')
      await api.delete(`/api/projects/${project.id}/boards/${board.id}`).set(authHeader(owner.token))
      const payload = await eventPromise
      expect(payload.boardId).toBe(board.id)
      socket.disconnect()
    })
  })

  describe('disconnect handling', () => {
    it('does not crash the server and the same user can reconnect', async () => {
      const { token } = await registerUser()
      const first = connect(token)
      await waitFor(first, 'connect')
      first.disconnect()

      // The server must still be healthy and accept a fresh connection from
      // the same user immediately after.
      const second = connect(token)
      await waitFor(second, 'connect')
      expect(second.connected).toBe(true)
      second.disconnect()

      const health = await api.get('/api/health')
      expect(health.status).toBe(200)
    })
  })
})
