import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  assigneesApi,
  boardsApi,
  tasksApi,
  type Assignee,
  type Board,
  type CreateTaskInput,
  type Task,
  type UpdateTaskInput,
} from '../lib/api'
import { useSocketEvent, useSocket } from '../realtime/SocketContext'
import { useToast } from '../components/ui/ToastContext'

export interface KanbanColumn {
  board: Board
  tasks: Task[]
}

interface TaskPayload {
  projectId: string
  boardId: string
  task: Task
}
interface TaskDeletedPayload {
  projectId: string
  boardId: string
  taskId: string
}
interface BoardPayload {
  projectId: string
  board: Board
}
interface BoardDeletedPayload {
  projectId: string
  boardId: string
}
interface AssigneePayload {
  projectId: string
  taskId: string
  assignee?: Assignee
  userId?: string
}

const TASK_PAGE_LIMIT = 50

// The single data/mutation hub for a project's Kanban board (Phase 14.8).
// A Board *is* this app's column — there is no separate status field (see
// lib/api/tasks.ts) — so this hook fetches every board in a project plus
// each board's tasks, keeps them in sync with the five task:*/board:*
// realtime events, and exposes mutation helpers that update local state
// from the REST response immediately (never waiting on the socket echo of
// the caller's own action) while realtime handlers apply the same updates
// idempotently for everyone else already looking at the board.
export function useKanban(projectId: string) {
  const [columns, setColumns] = useState<KanbanColumn[]>([])
  const [assigneesByTask, setAssigneesByTask] = useState<Record<string, Assignee[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { joinProject, leaveProject } = useSocket()
  const { show } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { boards } = await boardsApi.list(projectId)
      const sorted = [...boards].sort((a, b) => a.position - b.position)

      const withTasks = await Promise.all(
        sorted.map(async (board) => {
          const { tasks } = await tasksApi.list(projectId, board.id, 1, TASK_PAGE_LIMIT)
          return { board, tasks: tasks.sort((a, b) => a.position - b.position) }
        }),
      )
      setColumns(withTasks)

      // Assignees have no batch endpoint (see docs/FRONTEND.md's
      // performance section) — fetched concurrently, once per task, rather
      // than sequentially or refetched on every render.
      const allTasks = withTasks.flatMap((c) => c.tasks)
      const assigneeEntries = await Promise.all(
        allTasks.map(async (task) => {
          const { assignees } = await assigneesApi.list(projectId, task.boardId, task.id)
          return [task.id, assignees] as const
        }),
      )
      setAssigneesByTask(Object.fromEntries(assigneeEntries))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    joinProject(projectId)
    return () => leaveProject(projectId)
  }, [projectId, joinProject, leaveProject])

  // --- Realtime reconciliation — every handler is idempotent (safe to
  // apply even if this client's own mutation already applied the same
  // change from its REST response) and never shows a toast, so a toast
  // never appears twice for one logical action (Phase 15.7). ---

  useSocketEvent<BoardPayload>('board:created', (p) => {
    if (p.projectId !== projectId) return
    setColumns((cols) => (cols.some((c) => c.board.id === p.board.id) ? cols : [...cols, { board: p.board, tasks: [] }]))
  })
  useSocketEvent<BoardPayload>('board:updated', (p) => {
    if (p.projectId !== projectId) return
    setColumns((cols) => cols.map((c) => (c.board.id === p.board.id ? { ...c, board: p.board } : c)))
  })
  useSocketEvent<BoardDeletedPayload>('board:deleted', (p) => {
    if (p.projectId !== projectId) return
    setColumns((cols) => cols.filter((c) => c.board.id !== p.boardId))
  })

  useSocketEvent<TaskPayload>('task:created', (p) => {
    if (p.projectId !== projectId) return
    setColumns((cols) =>
      cols.map((c) =>
        c.board.id === p.boardId && !c.tasks.some((t) => t.id === p.task.id)
          ? { ...c, tasks: [...c.tasks, p.task].sort((a, b) => a.position - b.position) }
          : c,
      ),
    )
  })
  useSocketEvent<TaskPayload>('task:updated', (p) => {
    if (p.projectId !== projectId) return
    setColumns((cols) =>
      cols.map((c) => ({ ...c, tasks: c.tasks.map((t) => (t.id === p.task.id ? p.task : t)) })),
    )
  })
  useSocketEvent<TaskPayload>('task:moved', (p) => {
    if (p.projectId !== projectId) return
    setColumns((cols) =>
      cols.map((c) => {
        const withoutMoved = c.tasks.filter((t) => t.id !== p.task.id)
        const belongsHere = c.board.id === p.task.boardId
        const tasks = belongsHere ? [...withoutMoved, p.task] : withoutMoved
        return { ...c, tasks: tasks.sort((a, b) => a.position - b.position) }
      }),
    )
  })
  useSocketEvent<TaskDeletedPayload>('task:deleted', (p) => {
    if (p.projectId !== projectId) return
    setColumns((cols) => cols.map((c) => ({ ...c, tasks: c.tasks.filter((t) => t.id !== p.taskId) })))
  })

  useSocketEvent<AssigneePayload>('task:assigned', (p) => {
    if (p.projectId !== projectId || !p.assignee) return
    setAssigneesByTask((current) => {
      const existing = current[p.taskId] ?? []
      if (existing.some((a) => a.id === p.assignee!.id)) return current
      return { ...current, [p.taskId]: [...existing, p.assignee!] }
    })
  })
  useSocketEvent<AssigneePayload>('task:unassigned', (p) => {
    if (p.projectId !== projectId || !p.userId) return
    setAssigneesByTask((current) => ({
      ...current,
      [p.taskId]: (current[p.taskId] ?? []).filter((a) => a.id !== p.userId),
    }))
  })

  // --- Mutations — each updates local state from the REST response and
  // toasts the outcome; realtime delivers the same change to everyone else. ---

  const createBoard = useCallback(
    async (name: string) => {
      const { board } = await boardsApi.create(projectId, { name })
      // The backend emits board:created right after its own Prisma write
      // commits, before the HTTP response is even sent (see
      // board.service.js) — so the realtime handler above can already have
      // added this same board by the time this REST call resolves. Checked
      // by id, same as every realtime handler, so whichever update runs
      // second is a no-op instead of a duplicate column.
      setColumns((cols) => (cols.some((c) => c.board.id === board.id) ? cols : [...cols, { board, tasks: [] }]))
      show('Board created.', 'success', `board-create-${board.id}`)
      return board
    },
    [projectId, show],
  )

  const renameBoard = useCallback(
    async (boardId: string, name: string) => {
      const { board } = await boardsApi.update(projectId, boardId, { name })
      setColumns((cols) => cols.map((c) => (c.board.id === boardId ? { ...c, board } : c)))
      show('Board updated.', 'success', `board-update-${boardId}`)
    },
    [projectId, show],
  )

  const deleteBoard = useCallback(
    async (boardId: string) => {
      await boardsApi.remove(projectId, boardId)
      setColumns((cols) => cols.filter((c) => c.board.id !== boardId))
      show('Board deleted.', 'success', `board-delete-${boardId}`)
    },
    [projectId, show],
  )

  const createTask = useCallback(
    async (boardId: string, input: CreateTaskInput) => {
      const { task } = await tasksApi.create(projectId, boardId, input)
      // Same race as createBoard above (task:created can arrive before this
      // promise resolves) — guarded the same way, by id.
      setColumns((cols) =>
        cols.map((c) =>
          c.board.id === boardId && !c.tasks.some((t) => t.id === task.id)
            ? { ...c, tasks: [...c.tasks, task] }
            : c,
        ),
      )
      setAssigneesByTask((current) => (task.id in current ? current : { ...current, [task.id]: [] }))
      show('Task created.', 'success', `task-create-${task.id}`)
      return task
    },
    [projectId, show],
  )

  const updateTask = useCallback(
    async (boardId: string, taskId: string, input: UpdateTaskInput) => {
      const { task } = await tasksApi.update(projectId, boardId, taskId, input)
      setColumns((cols) =>
        cols.map((c) => ({ ...c, tasks: c.tasks.map((t) => (t.id === taskId ? task : t)) })),
      )
      show('Task updated.', 'success', `task-update-${taskId}`)
      return task
    },
    [projectId, show],
  )

  const deleteTask = useCallback(
    async (boardId: string, taskId: string) => {
      await tasksApi.remove(projectId, boardId, taskId)
      setColumns((cols) => cols.map((c) => ({ ...c, tasks: c.tasks.filter((t) => t.id !== taskId) })))
      show('Task deleted.', 'success', `task-delete-${taskId}`)
    },
    [projectId, show],
  )

  // Reorders tasks within a single column (moving a task to a *different*
  // column is moveTaskToBoard, below). Only PATCHes the tasks whose
  // position actually changed, not every task in the column.
  const reorderWithinColumn = useCallback(
    async (boardId: string, fromIndex: number, toIndex: number) => {
      const column = columns.find((c) => c.board.id === boardId)
      if (!column || fromIndex === toIndex) return

      const reordered = [...column.tasks]
      const [moved] = reordered.splice(fromIndex, 1)
      reordered.splice(toIndex, 0, moved)

      const changed = reordered
        .map((task, index) => ({ task, index }))
        .filter(({ task, index }) => task.position !== index)

      setColumns((cols) =>
        cols.map((c) =>
          c.board.id === boardId
            ? { ...c, tasks: reordered.map((t, i) => ({ ...t, position: i })) }
            : c,
        ),
      )

      try {
        await Promise.all(
          changed.map(({ task, index }) => tasksApi.update(projectId, boardId, task.id, { position: index })),
        )
      } catch (err) {
        show(err instanceof ApiError ? err.message : 'Could not save the new order.', 'error')
        load()
      }
    },
    [columns, projectId, show, load],
  )

  // Moves a task to a different board — this app's "drag to another
  // column" operation, now that the backend supports changing a task's
  // boardId (see lib/api/tasks.ts). Follows the exact same optimistic-then-
  // rollback shape as reorderWithinColumn above: local state updates
  // immediately (so the drag feels instant), every task whose position
  // actually changed in either column is persisted, and any failure rolls
  // back via a full reload() rather than leaving the UI showing a move
  // that didn't actually save.
  const moveTaskToBoard = useCallback(
    async (fromBoardId: string, taskId: string, toBoardId: string, toIndex: number) => {
      if (fromBoardId === toBoardId) return

      const fromColumn = columns.find((c) => c.board.id === fromBoardId)
      const toColumn = columns.find((c) => c.board.id === toBoardId)
      const task = fromColumn?.tasks.find((t) => t.id === taskId)
      if (!fromColumn || !toColumn || !task) return

      const remainingSource = fromColumn.tasks
        .filter((t) => t.id !== taskId)
        .map((t, i) => ({ ...t, position: i }))

      const destinationWithoutMoved = toColumn.tasks.filter((t) => t.id !== taskId)
      const insertAt = Math.max(0, Math.min(toIndex, destinationWithoutMoved.length))
      const destinationWithMoved = [...destinationWithoutMoved]
      destinationWithMoved.splice(insertAt, 0, { ...task, boardId: toBoardId })
      const renumberedDestination = destinationWithMoved.map((t, i) => ({ ...t, position: i }))

      setColumns((cols) =>
        cols.map((c) => {
          if (c.board.id === fromBoardId) return { ...c, tasks: remainingSource }
          if (c.board.id === toBoardId) return { ...c, tasks: renumberedDestination }
          return c
        }),
      )

      const sourceChanges = remainingSource.filter((t) => {
        const original = fromColumn.tasks.find((orig) => orig.id === t.id)
        return original && original.position !== t.position
      })
      const destinationChanges = renumberedDestination.filter((t) => {
        if (t.id === taskId) return false // the moved task's own PATCH (below) carries its position
        const original = toColumn.tasks.find((orig) => orig.id === t.id)
        return original && original.position !== t.position
      })
      const movedTaskPosition = renumberedDestination.find((t) => t.id === taskId)!.position

      try {
        await Promise.all([
          tasksApi.update(projectId, fromBoardId, taskId, { boardId: toBoardId, position: movedTaskPosition }),
          ...sourceChanges.map((t) => tasksApi.update(projectId, fromBoardId, t.id, { position: t.position })),
          ...destinationChanges.map((t) => tasksApi.update(projectId, toBoardId, t.id, { position: t.position })),
        ])
      } catch (err) {
        show(err instanceof ApiError ? err.message : 'Could not move the task. Please try again.', 'error')
        load()
      }
    },
    [columns, projectId, show, load],
  )

  const assignUser = useCallback(
    async (boardId: string, taskId: string, userId: string) => {
      const { assignee } = await assigneesApi.add(projectId, boardId, taskId, userId)
      // Same race as createBoard/createTask above (task:assigned can arrive
      // before this promise resolves) — guarded the same way, by id.
      setAssigneesByTask((current) => {
        const existing = current[taskId] ?? []
        if (existing.some((a) => a.id === assignee.id)) return current
        return { ...current, [taskId]: [...existing, assignee] }
      })
      show('Assignee added.', 'success', `assign-${taskId}-${userId}`)
    },
    [projectId, show],
  )

  const unassignUser = useCallback(
    async (boardId: string, taskId: string, userId: string) => {
      await assigneesApi.remove(projectId, boardId, taskId, userId)
      setAssigneesByTask((current) => ({
        ...current,
        [taskId]: (current[taskId] ?? []).filter((a) => a.id !== userId),
      }))
      show('Assignee removed.', 'success', `unassign-${taskId}-${userId}`)
    },
    [projectId, show],
  )

  const totalTasks = useMemo(() => columns.reduce((sum, c) => sum + c.tasks.length, 0), [columns])

  return {
    columns,
    assigneesByTask,
    loading,
    error,
    reload: load,
    totalTasks,
    createBoard,
    renameBoard,
    deleteBoard,
    createTask,
    updateTask,
    deleteTask,
    reorderWithinColumn,
    moveTaskToBoard,
    assignUser,
    unassignUser,
  }
}
