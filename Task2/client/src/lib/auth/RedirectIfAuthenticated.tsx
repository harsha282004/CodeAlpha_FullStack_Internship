import { useEffect, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from './AuthContext'

/** Wraps /login and /register so an already-authenticated visitor is bounced to /feed. */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (status === 'authenticated') {
      navigate({ to: '/feed' })
    }
  }, [status, navigate])

  if (status === 'authenticated') return null

  return <>{children}</>
}
