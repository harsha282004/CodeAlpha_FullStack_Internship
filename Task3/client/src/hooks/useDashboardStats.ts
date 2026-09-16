import { useEffect, useState } from 'react'
import { boardsApi, tasksApi, type Project } from '../lib/api'

interface DashboardStats {
  totalTasks: number | null
  teamMembers: number
  loading: boolean
}

// Two additional aggregates the dashboard needs beyond what useProjects()
// and useNotifications() already expose — both computed from the SAME
// existing REST endpoints (no new backend route), per this task's own
// instruction to "use existing APIs and calculate accurately" rather than
// omit or fabricate.
//
// teamMembers: derived synchronously from data useProjects() already
// loaded (`project.memberCount`) — the count of *other* people across every
// project this user belongs to (memberCount - 1, floored at 0, summed).
// This is a seat count, not a de-duplicated person count: someone on two of
// your projects is counted twice, the same trade-off GitHub's own
// "contributors" widgets make, since de-duplicating would require fetching
// every project's full member list (a real N+1 pattern this app avoids
// elsewhere) just to render one dashboard number.
//
// totalTasks: not exposed by any single endpoint, so it's computed by
// fetching each project's boards, then each board's task count via
// `tasksApi.list(..., limit: 1)` — `limit: 1` because only the response's
// `pagination.total` is needed, not the task rows themselves, keeping the
// payload minimal. Requests fan out concurrently (Promise.allSettled, not
// sequential) and a request that fails doesn't zero out the whole count —
// it's simply excluded, and if *every* board's count fails the stat shows
// as unavailable (null) rather than a fabricated 0.
export function useDashboardStats(projects: Project[], projectsLoading: boolean) {
  const [stats, setStats] = useState<DashboardStats>({ totalTasks: null, teamMembers: 0, loading: true })

  useEffect(() => {
    if (projectsLoading) return

    const teamMembers = projects.reduce((sum, p) => sum + Math.max((p.memberCount ?? 1) - 1, 0), 0)

    if (projects.length === 0) {
      setStats({ totalTasks: 0, teamMembers, loading: false })
      return
    }

    let cancelled = false
    setStats((current) => ({ ...current, teamMembers, loading: true }))

    async function loadTaskTotal() {
      const boardLists = await Promise.allSettled(projects.map((p) => boardsApi.list(p.id).then((r) => ({ project: p, boards: r.boards }))))

      const boardRefs = boardLists.flatMap((result) =>
        result.status === 'fulfilled' ? result.value.boards.map((board) => ({ projectId: result.value.project.id, boardId: board.id })) : [],
      )

      if (boardRefs.length === 0) {
        if (!cancelled) setStats({ totalTasks: 0, teamMembers, loading: false })
        return
      }

      const counts = await Promise.allSettled(
        boardRefs.map((ref) => tasksApi.list(ref.projectId, ref.boardId, 1, 1).then((r) => r.pagination.total)),
      )

      const fulfilled = counts.filter((c): c is PromiseFulfilledResult<number> => c.status === 'fulfilled')
      const total = fulfilled.length > 0 ? fulfilled.reduce((sum, c) => sum + c.value, 0) : null

      if (!cancelled) setStats({ totalTasks: total, teamMembers, loading: false })
    }

    loadTaskTotal()

    return () => {
      cancelled = true
    }
  }, [projects, projectsLoading])

  return stats
}
