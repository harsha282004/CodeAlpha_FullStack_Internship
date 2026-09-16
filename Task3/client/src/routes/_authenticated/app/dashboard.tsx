import { createFileRoute, Link } from '@tanstack/react-router'
import { useAuth } from '../../../auth/AuthContext'
import { useProjects } from '../../../hooks/useProjects'
import { useNotifications } from '../../../hooks/useNotifications'
import { Card } from '../../../components/ui/Card'
import { RoleBadge } from '../../../components/ui/Badge'
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/Feedback'
import { timeAgo } from '../../../lib/format'

export const Route = createFileRoute('/_authenticated/app/dashboard')({
  component: DashboardPage,
})

// Every number on this page is a real, live count from the backend — no
// invented "productivity score" or fabricated activity chart. A metric
// this app's APIs genuinely can't answer (see Phase 14.3's "never
// fabricate numbers") is simply not shown here.
function DashboardPage() {
  const { user } = useAuth()
  const { projects, loading, error, reload } = useProjects()
  const { unreadCount } = useNotifications()

  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="text-sm text-slate-500">Here's what's happening across your projects.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Projects</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{loading ? '—' : projects.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Unread notifications</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{unreadCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Projects you own</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {loading ? '—' : projects.filter((p) => p.role === 'OWNER').length}
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Recent projects</h2>
          <Link to="/app/projects" className="text-xs font-medium text-indigo-600 hover:text-indigo-500">
            View all
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : recentProjects.length === 0 ? (
          <EmptyState
            title="Create your first project to get started."
            action={
              <Link
                to="/app/projects"
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Create a project
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentProjects.map((project) => (
              <li key={project.id}>
                <Link
                  to="/app/projects/$projectId"
                  params={{ projectId: project.id }}
                  className="flex items-center justify-between gap-3 py-3 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{project.name}</p>
                    <p className="text-xs text-slate-400">Created {timeAgo(project.createdAt)}</p>
                  </div>
                  {project.role && <RoleBadge role={project.role} />}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
