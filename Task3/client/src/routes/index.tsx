import { createFileRoute } from '@tanstack/react-router'
import { useHealthCheck } from '../hooks/useHealthCheck'
import { StatusBadge } from '../components/StatusBadge'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { apiStatus, dbStatus } = useHealthCheck()

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-4 py-16">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold text-slate-900">TaskFlow</h1>
        <p className="text-sm text-slate-600">
          CodeAlpha Full Stack Development Internship — Task 3
        </p>
        <p className="text-sm text-slate-500">
          Project scaffolding is complete. Authentication, projects, boards,
          and tasks are implemented in later phases.
        </p>
      </div>

      <div className="space-y-3">
        <StatusBadge label="Express API (/api/health)" status={apiStatus} />
        <StatusBadge label="PostgreSQL (/api/health/db)" status={dbStatus} />
      </div>
    </main>
  )
}
