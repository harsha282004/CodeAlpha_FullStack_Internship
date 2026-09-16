import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useAuth } from '../auth/AuthContext'
import { getAccessToken } from '../auth/tokenStorage'

// Socket.IO's own base URL — same host/port as the REST API, but without
// the '/api' prefix (Socket.IO attaches its own '/socket.io/' path at the
// server root, not under the Express API router — see server/src/server.js).
const SOCKET_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:5002/api').replace(/\/api\/?$/, '')

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected'

interface SocketContextValue {
  status: ConnectionStatus
  socket: Socket | null
  joinProject: (projectId: string) => void
  leaveProject: (projectId: string) => void
}

const SocketContext = createContext<SocketContextValue | null>(null)

// Connects only once authenticated (reusing the exact same JWT the REST API
// uses — see server/src/realtime/socket.js's authenticateSocket) and
// disconnects on logout. REST remains the source of truth throughout: this
// provider never blocks rendering on connection state, it only exposes it
// so the header can show a subtle indicator (see components/ui/Feedback.tsx's
// ConnectionDot).
export function SocketProvider({ children }: { children: ReactNode }) {
  const { status: authStatus } = useAuth()
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const socketRef = useRef<Socket | null>(null)
  const joinedRooms = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (authStatus !== 'authenticated') {
      socketRef.current?.disconnect()
      socketRef.current = null
      setStatus('disconnected')
      return
    }

    const token = getAccessToken()
    if (!token) return

    setStatus('connecting')
    const socket = io(SOCKET_URL, {
      auth: { token },
      // Socket.IO reconnects automatically with backoff by default — no
      // custom reconnection logic needed here beyond reflecting its state.
      reconnection: true,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setStatus('connected')
      // Re-join every project room the app currently cares about — a
      // reconnect (e.g. after a dropped connection) starts with zero rooms
      // server-side, so anything joined before must be rejoined.
      for (const projectId of joinedRooms.current) {
        socket.emit('project:join', { projectId })
      }
    })
    socket.on('disconnect', () => setStatus('disconnected'))
    socket.on('connect_error', () => setStatus('disconnected'))

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [authStatus])

  const joinProject = useCallback((projectId: string) => {
    joinedRooms.current.add(projectId)
    socketRef.current?.emit('project:join', { projectId })
  }, [])

  const leaveProject = useCallback((projectId: string) => {
    joinedRooms.current.delete(projectId)
    socketRef.current?.emit('project:leave', { projectId })
  }, [])

  return (
    <SocketContext.Provider value={{ status, socket: socketRef.current, joinProject, leaveProject }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const ctx = useContext(SocketContext)
  if (!ctx) throw new Error('useSocket must be used within a SocketProvider')
  return ctx
}

// Subscribes to a single Socket.IO event for the lifetime of the calling
// component, using whatever socket instance is current — resubscribes
// automatically if the underlying socket reconnects (a new Socket instance
// is only created on auth transitions, not on every reconnect, so this
// mostly just handles mount/unmount).
export function useSocketEvent<T>(event: string, handler: (payload: T) => void) {
  const { socket } = useSocket()
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (!socket) return
    const listener = (payload: T) => handlerRef.current(payload)
    socket.on(event, listener)
    return () => {
      socket.off(event, listener)
    }
  }, [socket, event])
}
