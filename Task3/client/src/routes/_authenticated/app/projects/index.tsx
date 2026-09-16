import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useProjects } from '../../../../hooks/useProjects'
import { ProjectCard } from '../../../../components/projects/ProjectCard'
import { CreateProjectModal } from '../../../../components/projects/CreateProjectModal'
import { Button } from '../../../../components/ui/Button'
import { EmptyState, ErrorState, Skeleton } from '../../../../components/ui/Feedback'

export const Route = createFileRoute('/_authenticated/app/projects/')({
  component: ProjectsPage,
})

function ProjectsPage() {
  const { projects, loading, error, reload, createProject } = useProjects()
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  // Creating a project is the start of a workflow, not the end of one — a
  // user who just named their project almost always wants to add a board
  // and a task next, so land them on the new project's own page rather
  // than leaving them looking at the list it was added to (Phase 15.9: no
  // dead-end screens).
  async function handleCreateProject(input: Parameters<typeof createProject>[0]) {
    const project = await createProject(input)
    navigate({ to: '/app/projects/$projectId', params: { projectId: project.id } })
    return project
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-500">Every project you're a member of.</p>
        </div>
        <Button onClick={() => setCreating(true)}>+ New project</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : projects.length === 0 ? (
        <EmptyState
          title="Create your first project to get started."
          action={<Button onClick={() => setCreating(true)}>Create a project</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <CreateProjectModal open={creating} onClose={() => setCreating(false)} onSubmit={handleCreateProject} />
    </div>
  )
}
