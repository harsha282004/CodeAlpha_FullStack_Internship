import { useEffect } from 'react'
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useAuth } from '../auth/AuthContext'
import { AppShell } from '../components/layout/AppShell'
import { PageSpinner } from '../components/ui/Feedback'

// Pathless layout (the leading `_` adds no URL segment) shared by every
// protected route: /app/dashboard, /app/projects/*, /profile, /settings —
// see their files under routes/_authenticated/. Auth state lives in React
// context (AuthContext), not router context, so the guard runs client-side
// here rather than in `beforeLoad` — a `beforeLoad` check would run during
// SSR too, where there is no localStorage token to read yet, and would
// wrongly redirect every authenticated user on first load.
export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { status } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (status === 'unauthenticated') {
      navigate({ to: '/login' })
    }
  }, [status, navigate])

  if (status !== 'authenticated') {
    return <PageSpinner label="Loading your workspace…" />
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
