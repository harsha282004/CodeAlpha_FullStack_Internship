import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '../../../auth/AuthContext'
import { useProjects } from '../../../hooks/useProjects'
import { useNotifications } from '../../../hooks/useNotifications'
import { useDashboardStats } from '../../../hooks/useDashboardStats'
import { DashboardHeader } from '../../../components/dashboard/DashboardHeader'
import { DashboardStats } from '../../../components/dashboard/DashboardStats'
import { RecentProjects } from '../../../components/dashboard/RecentProjects'
import { RecentNotifications } from '../../../components/dashboard/RecentNotifications'
import { QuickActions } from '../../../components/dashboard/QuickActions'
import { CollaborationBanner } from '../../../components/dashboard/CollaborationBanner'
import { CreateProjectModal } from '../../../components/projects/CreateProjectModal'

export const Route = createFileRoute('/_authenticated/app/dashboard')({
  component: DashboardPage,
})

// Every number and name on this page is real, live data from the
// authenticated user's own account — no invented "productivity score" or
// fabricated activity chart. A metric this app's APIs genuinely can't
// answer without an unreasonable number of requests is shown as "—"
// (loading) or "N/A" (unavailable), never a fabricated 0. See
// hooks/useDashboardStats.ts for exactly how Total Tasks and Team Members
// are computed from the same REST endpoints the rest of the app uses.
function DashboardPage() {
  const { user } = useAuth()
  const { projects, loading: projectsLoading, error, reload, createProject } = useProjects()
  const { notifications, unreadCount, loading: notificationsLoading, markRead } = useNotifications()
  const { totalTasks, teamMembers, loading: statsLoading } = useDashboardStats(projects, projectsLoading)
  const [creatingProject, setCreatingProject] = useState(false)

  const mostRecentProject = [...projects].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )[0]

  const displayName = user?.name?.split(' ')[0] ?? user?.username ?? 'there'

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-1 sm:px-2 lg:px-0">
      <DashboardHeader name={displayName} />

      <DashboardStats
        projects={projects}
        projectsLoading={projectsLoading}
        unreadCount={unreadCount}
        totalTasks={totalTasks}
        teamMembers={teamMembers}
        statsLoading={statsLoading}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <RecentProjects projects={projects} loading={projectsLoading} error={error} onRetry={reload} />

        <div className="space-y-6">
          <RecentNotifications notifications={notifications} loading={notificationsLoading} onMarkRead={markRead} />
          <QuickActions
            onCreateProject={() => setCreatingProject(true)}
            inviteProjectId={mostRecentProject?.id}
          />
        </div>
      </div>

      <CollaborationBanner />

      <CreateProjectModal
        open={creatingProject}
        onClose={() => setCreatingProject(false)}
        onSubmit={createProject}
      />
    </div>
  )
}
