import { useCallback, useEffect, useState } from 'react'
import { ApiError, projectsApi, type CreateProjectInput, type Project } from '../lib/api'
import { useToast } from '../components/ui/ToastContext'

// Projects the current user is a member of — dashboard and /app/projects
// both read from this same hook so a project created on one screen shows
// up on the other without a manual refresh dance.
export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { show } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { projects: list } = await projectsApi.list(1, 50)
      setProjects(list)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const createProject = useCallback(
    async (input: CreateProjectInput) => {
      const { project } = await projectsApi.create(input)
      setProjects((current) => [project, ...current])
      show('Project created.', 'success')
      return project
    },
    [show],
  )

  return { projects, loading, error, reload: load, createProject }
}
