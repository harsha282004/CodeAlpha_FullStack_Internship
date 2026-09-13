import { useEffect, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useAuth } from './AuthContext'

/**
 * Gates a protected page. Auth state lives only in localStorage (no
 * cookie), so this check can only run client-side after hydration — the
 * brief loading state below is the honest cost of a JWT-header-only
 * architecture rather than a server-verified session.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (status === 'unauthenticated') {
      navigate({ to: '/login' })
    }
  }, [status, navigate])

  if (status === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  return <>{children}</>
}
