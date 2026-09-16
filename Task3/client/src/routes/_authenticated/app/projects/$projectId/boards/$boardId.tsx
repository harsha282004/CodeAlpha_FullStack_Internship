import { createFileRoute, Link } from '@tanstack/react-router'
import { useAuth } from '../../../../../../auth/AuthContext'
import { useProject } from '../../../../../../hooks/useProject'
import { KanbanBoard } from '../../../../../../components/tasks/KanbanBoard'
import { ErrorState, PageSpinner } from '../../../../../../components/ui/Feedback'

export const Route = createFileRoute('/_authenticated/app/projects/$projectId/boards/$boardId')({
  component: BoardDetailPage,
})

// Deep-links to a single board within a project's Kanban view — e.g. from
// a notification about a task on this board. Renders the exact same
// multi-column KanbanBoard the project page does (a Board is a column, not
// an isolated page of its own — see docs/FRONTEND.md), just scrolled to and
// highlighted, rather than a duplicate single-column implementation.
function BoardDetailPage() {
  const { projectId, boardId } = Route.useParams()
  const { user } = useAuth()
  const { project, members, loading, error, reload } = useProject(projectId)

  if (loading) return <PageSpinner label="Loading board…" />
  if (error || !project || !user) return <ErrorState message={error ?? 'Project not found.'} onRetry={reload} />

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <Link
          to="/app/projects/$projectId"
          params={{ projectId }}
          className="text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          ← {project.name}
        </Link>
      </div>

      <KanbanBoard
        projectId={projectId}
        members={members}
        currentUserId={user.id}
        currentUserRole={project.role ?? 'MEMBER'}
        highlightBoardId={boardId}
      />
    </div>
  )
}
