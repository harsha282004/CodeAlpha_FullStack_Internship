import { Folder, ListChecks, Bell, Users } from 'lucide-react'
import { StatCard } from './StatCard'
import type { Project } from '../../lib/api'

interface DashboardStatsProps {
  projects: Project[]
  projectsLoading: boolean
  unreadCount: number
  totalTasks: number | null
  teamMembers: number
  statsLoading: boolean
}

// Every value here comes from a real hook already backed by the live API —
// useProjects()/useNotifications() (via props) and useDashboardStats() for
// the two aggregates neither of those exposes directly. Nothing is
// invented: a metric that can't yet be computed (task total, while the
// per-board requests are still in flight) shows "—", never a fabricated 0.
export function DashboardStats({
  projects,
  projectsLoading,
  unreadCount,
  totalTasks,
  teamMembers,
  statsLoading,
}: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        icon={Folder}
        tone="violet"
        label="Total Projects"
        value={projectsLoading ? '—' : String(projects.length)}
        description="Projects you're part of"
      />
      <StatCard
        icon={ListChecks}
        tone="mint"
        label="Total Tasks"
        value={statsLoading ? '—' : totalTasks === null ? 'N/A' : String(totalTasks)}
        description="Across every board"
      />
      <StatCard
        icon={Bell}
        tone="peach"
        label="Unread Notifications"
        value={String(unreadCount)}
        description="Waiting for your attention"
      />
      <StatCard
        icon={Users}
        tone="sky"
        label="Team Members"
        value={projectsLoading ? '—' : String(teamMembers)}
        description="Collaborating with you"
      />
    </div>
  )
}
