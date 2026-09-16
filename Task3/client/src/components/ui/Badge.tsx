import type { ReactNode } from 'react'
import type { ProjectRole, TaskPriority } from '../../lib/api'

export function Badge({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  )
}

const ROLE_CLASSES: Record<ProjectRole, string> = {
  OWNER: 'bg-violet-100 text-violet-700',
  ADMIN: 'bg-sky-100 text-sky-700',
  MEMBER: 'bg-slate-100 text-slate-600',
}

export function RoleBadge({ role }: { role: ProjectRole }) {
  return <Badge className={ROLE_CLASSES[role]}>{role}</Badge>
}

// Priority is communicated by label AND color/icon together — never color
// alone (WCAG 1.4.1) — see docs/FRONTEND.md's accessibility section.
const PRIORITY: Record<TaskPriority, { classes: string; icon: string }> = {
  LOW: { classes: 'bg-slate-100 text-slate-600', icon: '○' },
  MEDIUM: { classes: 'bg-sky-100 text-sky-700', icon: '◐' },
  HIGH: { classes: 'bg-amber-100 text-amber-800', icon: '▲' },
  URGENT: { classes: 'bg-red-100 text-red-700', icon: '⚠' },
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const { classes, icon } = PRIORITY[priority]
  return (
    <Badge className={classes}>
      <span aria-hidden="true">{icon}</span>
      {priority}
    </Badge>
  )
}
