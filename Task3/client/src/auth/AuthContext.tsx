import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi, onUnauthorized, type CurrentUser, type RegisterInput, type LoginInput } from '../lib/api'
import { clearAccessToken, getAccessToken, setAccessToken } from './tokenStorage'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthContextValue {
  status: AuthStatus
  user: CurrentUser | null
  // Non-null only immediately after an auth failure interrupted an
  // in-progress session (e.g. token expired mid-visit) — the login page
  // surfaces this once, then it's cleared, so it never lingers as stale UI.
  sessionMessage: string | null
  login: (input: LoginInput) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => void
  clearSessionMessage: () => void
  // Called after a successful PATCH /users/me (see routes/_authenticated/settings.tsx)
  // so the header/sidebar reflect a profile change immediately, without a
  // second round-trip to GET /auth/me just to re-read what was just written.
  updateUser: (user: CurrentUser) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [sessionMessage, setSessionMessage] = useState<string | null>(null)

  // Session restoration: a token in localStorage is only ever a claim until
  // GET /auth/me confirms it's still valid — the API remains authoritative,
  // never the mere presence of a stored string.
  useEffect(() => {
    const token = getAccessToken()
    if (!token) {
      setStatus('unauthenticated')
      return
    }

    let cancelled = false
    authApi
      .me()
      .then(({ user: current }) => {
        if (!cancelled) {
          setUser(current)
          setStatus('authenticated')
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearAccessToken()
          setStatus('unauthenticated')
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Fired by lib/api/client.ts on any 401 — the one place a session can end
  // involuntarily (expired/invalid token discovered mid-request), distinct
  // from the user clicking "log out".
  useEffect(() => {
    onUnauthorized(() => {
      clearAccessToken()
      setUser(null)
      setStatus('unauthenticated')
      setSessionMessage('Your session has expired. Please sign in again.')
    })
  }, [])

  const login = useCallback(async (input: LoginInput) => {
    const { user: loggedInUser, token } = await authApi.login(input)
    setAccessToken(token)
    setUser(loggedInUser)
    setStatus('authenticated')
  }, [])

  const register = useCallback(async (input: RegisterInput) => {
    const { user: registeredUser, token } = await authApi.register(input)
    setAccessToken(token)
    setUser(registeredUser)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(() => {
    clearAccessToken()
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  const clearSessionMessage = useCallback(() => setSessionMessage(null), [])
  const updateUser = useCallback((updated: CurrentUser) => setUser(updated), [])

  const value = useMemo(
    () => ({ status, user, sessionMessage, login, register, logout, clearSessionMessage, updateUser }),
    [status, user, sessionMessage, login, register, logout, clearSessionMessage, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
