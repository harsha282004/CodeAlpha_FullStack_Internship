import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  projectsApi,
  type AssignableRole,
  type Project,
  type ProjectMember,
} from '../lib/api'
import { useSocketEvent } from '../realtime/SocketContext'
import { useToast } from '../components/ui/ToastContext'

interface MemberAddedPayload {
  projectId: string
  member: ProjectMember
}

// A single project's detail + member list, kept in sync with
// project:member_added (the one project-detail-relevant realtime event —
// board/task events are handled separately by useKanban). Shared by the
// project detail page and its member-management panel.
export function useProject(projectId: string) {
  const [project, setProject] = useState<Project | null>(null)
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { show } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [{ project: p }, { members: m }] = await Promise.all([
        projectsApi.get(projectId),
        projectsApi.listMembers(projectId),
      ])
      setProject(p)
      setMembers(m)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  useSocketEvent<MemberAddedPayload>('project:member_added', (p) => {
    if (p.projectId !== projectId) return
    setMembers((current) => (current.some((m) => m.id === p.member.id) ? current : [...current, p.member]))
  })

  const updateProject = useCallback(
    async (input: { name?: string; description?: string | null }) => {
      const { project: updated } = await projectsApi.update(projectId, input)
      setProject(updated)
      show('Project updated.', 'success')
      return updated
    },
    [projectId, show],
  )

  const removeProject = useCallback(async () => {
    await projectsApi.remove(projectId)
    show('Project deleted.', 'success')
  }, [projectId, show])

  const addMember = useCallback(
    async (userId: string, role?: AssignableRole) => {
      const { member } = await projectsApi.addMember(projectId, userId, role)
      setMembers((current) => (current.some((m) => m.id === member.id) ? current : [...current, member]))
      show('Member added.', 'success')
      return member
    },
    [projectId, show],
  )

  const removeMember = useCallback(
    async (userId: string) => {
      await projectsApi.removeMember(projectId, userId)
      setMembers((current) => current.filter((m) => m.id !== userId))
      show('Member removed.', 'success')
    },
    [projectId, show],
  )

  const changeMemberRole = useCallback(
    async (userId: string, role: AssignableRole) => {
      const { member } = await projectsApi.changeMemberRole(projectId, userId, role)
      setMembers((current) => current.map((m) => (m.id === userId ? member : m)))
      show('Member role updated.', 'success')
    },
    [projectId, show],
  )

  return {
    project,
    members,
    loading,
    error,
    reload: load,
    updateProject,
    removeProject,
    addMember,
    removeMember,
    changeMemberRole,
  }
}
