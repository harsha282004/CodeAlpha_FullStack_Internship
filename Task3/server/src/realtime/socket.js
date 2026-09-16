import { Server } from 'socket.io'
import { env } from '../config/env.js'
import { verifyAccessToken } from '../utils/jwt.js'
import { prisma } from '../config/prisma.js'

// Module-level singleton, set once by initSocketServer() at boot — mirrors
// config/prisma.js's own singleton pattern. Services import getIO()/
// emitToProject()/emitToUser() rather than the Server instance directly, so
// they never need to know whether Socket.IO has been initialized yet (it
// always has been, by the time a request can reach a service — but this
// also means importing a service module alone, e.g. in a future test, never
// requires booting a real socket server).
let io = null

function roomForProject(projectId) {
  return `project:${projectId}`
}

function roomForUser(userId) {
  return `user:${userId}`
}

// Socket handshake auth — reuses the exact same JWT verification as
// requireAuth (server/src/middleware/auth.middleware.js); no second
// authentication system. Socket.IO's own convention is a token in the
// handshake `auth` payload (`socket.handshake.auth.token`), not a header,
// but it's verified with the identical verifyAccessToken() every REST
// request uses. Every failure mode (missing/malformed/expired/tampered/
// wrong-secret token) is rejected the same generic way — the client only
// ever learns "Authentication required," never which case it hit.
function authenticateSocket(socket, next) {
  const token = socket.handshake.auth?.token

  if (typeof token !== 'string' || token.length === 0) {
    return next(new Error('Authentication required'))
  }

  let payload
  try {
    payload = verifyAccessToken(token)
  } catch {
    return next(new Error('Authentication required'))
  }

  if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
    return next(new Error('Authentication required'))
  }

  socket.userId = payload.sub
  next()
}

// Verifies project membership fresh from PostgreSQL before letting a socket
// join that project's room — never trusts anything the client claims about
// its own membership. Mirrors requireProjectMember's own reasoning
// (including its "project doesn't exist" vs. "you're just not in it"
// distinction), applied to a socket event instead of an HTTP request.
async function handleProjectJoin(socket, payload, respond) {
  const projectId = payload && typeof payload.projectId === 'string' ? payload.projectId : null
  if (!projectId) {
    return respond({ success: false, message: 'projectId is required' })
  }

  try {
    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: socket.userId } },
      select: { userId: true },
    })
    if (membership) {
      socket.join(roomForProject(projectId))
      return respond({ success: true })
    }

    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } })
    if (!project) {
      return respond({ success: false, message: 'Project not found' })
    }
    return respond({ success: false, message: 'You are not a member of this project' })
  } catch (error) {
    // Logged in full server-side; the client only ever gets a generic
    // message — same discipline as the REST error handler.
    console.error('Socket project:join failed:', error)
    respond({ success: false, message: 'Something went wrong' })
  }
}

function handleProjectLeave(socket, payload) {
  const projectId = payload && typeof payload.projectId === 'string' ? payload.projectId : null
  if (projectId) {
    socket.leave(roomForProject(projectId))
  }
}

export function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      // Same CLIENT_URL used for REST CORS — never "*", and never a second,
      // separately-maintained origin policy for the socket transport.
      origin: env.clientUrl,
    },
  })

  io.use(authenticateSocket)

  io.on('connection', (socket) => {
    // Every authenticated socket automatically joins its own personal
    // notification channel — a user always owns their own notifications,
    // so no separate membership proof is needed the way a project room
    // requires one.
    socket.join(roomForUser(socket.userId))

    socket.on('project:join', (payload, callback) => {
      const respond = typeof callback === 'function' ? callback : () => {}
      handleProjectJoin(socket, payload, respond)
    })

    socket.on('project:leave', (payload) => {
      handleProjectLeave(socket, payload)
    })

    // Defensive: prevents an unhandled 'error' event on this socket from
    // crashing the process (Node's EventEmitter throws on an unhandled
    // 'error' event specifically). Never logs the token or any handshake
    // detail — just the error message.
    socket.on('error', (error) => {
      console.error('Socket error:', error.message)
    })

    socket.on('disconnect', () => {
      // Socket.IO automatically removes this socket from every room it
      // joined (project:*, user:<id>) — no manual cleanup needed here.
    })
  })

  // Fires for handshake-level failures (including authenticateSocket's
  // rejections) — logged with only the error message, never the attempted
  // token or other request detail.
  io.engine.on('connection_error', (err) => {
    console.warn('Socket connection error:', err.message)
  })

  return io
}

export function getIO() {
  return io
}

// Broadcast to everyone currently in a project's room. A safe no-op if
// Socket.IO hasn't been initialized (e.g. a script that imports a service
// directly without booting the full server) — emission is always
// best-effort and never the source of truth; by the time this is called,
// the triggering database write has already committed.
export function emitToProject(projectId, event, payload) {
  if (!io) return
  io.to(roomForProject(projectId)).emit(event, payload)
}

// Broadcast to every socket authenticated as a specific user — used for
// notifications, which are per-user, not per-project.
export function emitToUser(userId, event, payload) {
  if (!io) return
  io.to(roomForUser(userId)).emit(event, payload)
}
