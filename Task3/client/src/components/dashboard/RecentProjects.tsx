import { Link } from '@tanstack/react-router'
import { Folder, ChevronRight } from 'lucide-react'
import { Card } from '../ui/Card'
import { RoleBadge } from '../ui/Badge'
import { ErrorState, Skeleton } from '../ui/Feedback'
import { EmptyProjectState } from './EmptyProjectState'
import { timeAgo } from '../../lib/format'
import type { Project } from '../../lib/api'

interface RecentProjectsProps {
  projects: Project[]
  loading: boolean
  error: string | null
  onRetry: () => void
}

export function RecentProjects({ projects, loading, error, onRetry }: RecentProjectsProps) {
  const recent = [...projects]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  return (
    <Card className="rounded-[20px] p-6 sm:p-7">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 sm:text-[22px]">Recent projects</h2>
        <Link
          to="/app/projects"
          className="text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-500"
        >
          View all →
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3 pt-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : recent.length === 0 ? (
        <EmptyProjectState />
      ) : (
        <ul className="divide-y divide-slate-100">
          {recent.map((project) => (
            <li key={project.id}>
              <Link
                to="/app/projects/$projectId"
                params={{ projectId: project.id }}
                className="group flex items-center gap-4 py-4 transition-colors hover:bg-slate-50 sm:rounded-xl sm:px-2"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                  <Folder className="h-5 w-5" aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-base font-semibold text-slate-900">{project.name}</p>
                    {project.role && <RoleBadge role={project.role} />}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-slate-500">
                    {project.description || 'No description.'}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {project.memberCount !== undefined
                      ? `${project.memberCount} member${project.memberCount === 1 ? '' : 's'} · `
                      : ''}
                    Updated {timeAgo(project.updatedAt)}
                  </p>
                </div>

                <ChevronRight
                  className="h-5 w-5 shrink-0 text-slate-300 transition-colors group-hover:text-indigo-500"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
