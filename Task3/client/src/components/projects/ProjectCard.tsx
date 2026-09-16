import { Link } from '@tanstack/react-router'
import type { Project } from '../../lib/api'
import { Card } from '../ui/Card'
import { RoleBadge } from '../ui/Badge'
import { formatDate } from '../../lib/format'

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link to="/app/projects/$projectId" params={{ projectId: project.id }}>
      <Card className="flex h-full flex-col gap-3 p-5 transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-base font-semibold text-slate-900">{project.name}</h3>
          {project.role && <RoleBadge role={project.role} />}
        </div>
        <p className="line-clamp-2 flex-1 text-sm text-slate-500">
          {project.description || 'No description.'}
        </p>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{project.memberCount !== undefined ? `${project.memberCount} member${project.memberCount === 1 ? '' : 's'}` : ''}</span>
          <span>Created {formatDate(project.createdAt)}</span>
        </div>
      </Card>
    </Link>
  )
}
