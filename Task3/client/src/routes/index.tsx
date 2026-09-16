import { createFileRoute, Link } from '@tanstack/react-router'
import { useHealthCheck } from '../hooks/useHealthCheck'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../auth/AuthContext'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { apiStatus, dbStatus } = useHealthCheck()
  const { status } = useAuth()

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-8 px-4 py-16">
      <div className="space-y-3 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">TaskFlow</h1>
        <p className="text-base text-slate-600">
          A collaborative project management tool — boards, tasks, comments, and
          real-time updates for your team.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        {status === 'authenticated' ? (
          <Link
            to="/app/dashboard"
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Go to dashboard
          </Link>
        ) : (
          <>
            <Link
              to="/login"
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Create an account
            </Link>
          </>
        )}
      </div>

      <div className="space-y-2 pt-6">
        <StatusBadge label="Express API (/api/health)" status={apiStatus} />
        <StatusBadge label="PostgreSQL (/api/health/db)" status={dbStatus} />
      </div>
    </main>
  )
}
