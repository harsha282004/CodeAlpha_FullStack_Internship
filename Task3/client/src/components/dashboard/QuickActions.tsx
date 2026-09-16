import type { ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { FolderPlus, UserPlus, Compass, Settings, ChevronRight } from 'lucide-react'
import { Card } from '../ui/Card'
import { useToast } from '../ui/ToastContext'

interface QuickActionsProps {
  onCreateProject: () => void
  /** The most recently updated project the user belongs to, if any — used
   * to send "Invite member" somewhere real instead of a dead end. */
  inviteProjectId?: string
}

interface ActionRowProps {
  icon: ReactNode
  iconBg: string
  title: string
  subtitle: string
  onClick: () => void
}

function ActionRow({ icon, iconBg, title, subtitle, onClick }: ActionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-xl px-2 py-3 text-left transition-colors hover:bg-slate-50"
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-slate-900">{title}</p>
        <p className="truncate text-sm text-slate-500">{subtitle}</p>
      </div>
      <ChevronRight
        className="h-5 w-5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500"
        aria-hidden="true"
      />
    </button>
  )
}

// Every action here goes somewhere real. "Invite member" is the one that
// needs context a global dashboard doesn't have on its own (which project?)
// — it opens that project's own Members tab rather than pretending a
// project-less invitation exists; with no projects yet, it explains why
// instead of failing silently.
export function QuickActions({ onCreateProject, inviteProjectId }: QuickActionsProps) {
  const navigate = useNavigate()
  const { show } = useToast()

  function handleInvite() {
    if (inviteProjectId) {
      navigate({ to: '/app/projects/$projectId', params: { projectId: inviteProjectId }, search: { tab: 'members' } })
    } else {
      show('Create a project first, then you can invite members to it.', 'info')
      navigate({ to: '/app/projects' })
    }
  }

  return (
    <Card className="rounded-[20px] p-6 sm:p-7">
      <h2 className="mb-1 text-xl font-bold text-slate-900 sm:text-[22px]">Quick actions</h2>
      <div className="mt-2 divide-y divide-slate-100">
        <ActionRow
          icon={<FolderPlus className="h-5 w-5 text-violet-600" aria-hidden="true" />}
          iconBg="bg-violet-100"
          title="Create project"
          subtitle="Start a new project"
          onClick={onCreateProject}
        />
        <ActionRow
          icon={<UserPlus className="h-5 w-5 text-sky-600" aria-hidden="true" />}
          iconBg="bg-sky-100"
          title="Invite member"
          subtitle="Add your team members"
          onClick={handleInvite}
        />
        <ActionRow
          icon={<Compass className="h-5 w-5 text-emerald-600" aria-hidden="true" />}
          iconBg="bg-emerald-100"
          title="Browse projects"
          subtitle="View all your projects"
          onClick={() => navigate({ to: '/app/projects' })}
        />
        <ActionRow
          icon={<Settings className="h-5 w-5 text-orange-600" aria-hidden="true" />}
          iconBg="bg-orange-100"
          title="Account settings"
          subtitle="Manage your preferences"
          onClick={() => navigate({ to: '/settings' })}
        />
      </div>
    </Card>
  )
}
