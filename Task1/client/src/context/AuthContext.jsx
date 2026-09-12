import { useCallback, useEffect, useState } from 'react'
import { getMe, login as loginRequest, register as registerRequest } from '../api/auth.js'
import { setAuthToken } from '../api/client.js'
import { AuthContext } from './authContext.js'

const TOKEN_STORAGE_KEY = 'shopsphere_token'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function restoreSession() {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY)
      if (!storedToken) {
        setIsLoading(false)
        return
      }

      setAuthToken(storedToken)
      try {
        const restoredUser = await getMe()
        setToken(storedToken)
        setUser(restoredUser)
      } catch {
        localStorage.removeItem(TOKEN_STORAGE_KEY)
        setAuthToken(null)
      } finally {
        setIsLoading(false)
      }
    }

    restoreSession()
  }, [])

  const applySession = useCallback((newToken, newUser) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, newToken)
    setAuthToken(newToken)
    setToken(newToken)
    setUser(newUser)
  }, [])

  const login = useCallback(
    async (email, password) => {
      const { user: loggedInUser, token: newToken } = await loginRequest(email, password)
      applySession(newToken, loggedInUser)
      return loggedInUser
    },
    [applySession],
  )

  const register = useCallback(
    async (name, email, password) => {
      const { user: newUser, token: newToken } = await registerRequest(name, email, password)
      applySession(newToken, newUser)
      return newUser
    },
    [applySession],
  )

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    setAuthToken(null)
    setToken(null)
    setUser(null)
  }, [])

  const value = {
    user,
    token,
    isAuthenticated: Boolean(user),
    isLoading,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
