import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getCurrentUser, login as loginRequest, registerAccount } from '../api/auth'
import type { LoginInput, RegisterInput } from '../api/auth'
import { clearStoredToken, getStoredToken, setStoredToken, setUnauthorizedHandler } from '../api/client'
import type { PrivateUser } from '../api/types'
import { useToast } from '../toast/ToastContext'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthContextValue {
  user: PrivateUser | null
  status: AuthStatus
  login: (input: LoginInput) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => void
  /** Re-syncs the cached user (e.g. after editing the profile). */
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PrivateUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const { showToast } = useToast()

  const logout = useCallback(
    (silent = false) => {
      clearStoredToken()
      setUser(null)
      setStatus('unauthenticated')
      if (!silent) {
        showToast({ message: 'You have been signed out.' })
      }
    },
    [showToast],
  )

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout(true)
      showToast({ tone: 'destructive', message: 'Your session expired. Please log in again.' })
    })
    return () => setUnauthorizedHandler(null)
  }, [logout, showToast])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      if (!getStoredToken()) {
        if (!cancelled) setStatus('unauthenticated')
        return
      }
      try {
        const { user: currentUser } = await getCurrentUser({ suppressUnauthorizedHandling: true })
        if (!cancelled) {
          setUser(currentUser)
          setStatus('authenticated')
        }
      } catch {
        clearStoredToken()
        if (!cancelled) {
          setUser(null)
          setStatus('unauthenticated')
        }
      }
    }

    bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (input: LoginInput) => {
    const result = await loginRequest(input)
    setStoredToken(result.token)
    setUser(result.user)
    setStatus('authenticated')
  }, [])

  const register = useCallback(async (input: RegisterInput) => {
    const result = await registerAccount(input)
    setStoredToken(result.token)
    setUser(result.user)
    setStatus('authenticated')
  }, [])

  const refreshUser = useCallback(async () => {
    const { user: currentUser } = await getCurrentUser({ suppressUnauthorizedHandling: false })
    setUser(currentUser)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, register, logout: () => logout(false), refreshUser }),
    [user, status, login, register, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
