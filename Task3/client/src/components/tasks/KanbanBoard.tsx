import { useState } from 'react'
import type { ProjectMember, ProjectRole, Task } from '../../lib/api'
import { ApiError } from '../../lib/api'
import { useKanban } from '../../hooks/useKanban'
import { BoardColumn, BoardColumnSkeleton } from './BoardColumn'
import { BoardFormModal } from './BoardFormModal'
import { CreateTaskModal } from './CreateTaskModal'
import { TaskDetailModal } from './TaskDetailModal'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { EmptyState, ErrorState } from '../ui/Feedback'
import { useToast } from '../ui/ToastContext'

interface KanbanBoardProps {
  projectId: string
  members: ProjectMember[]
  currentUserId: string
  currentUserRole: ProjectRole
  highlightBoardId?: string
}

const canManageBoards = (role: ProjectRole) => role === 'OWNER' || role === 'ADMIN'

export function KanbanBoard({ projectId, members, currentUserId, currentUserRole, highlightBoardId }: KanbanBoardProps) {
  const {
    columns,
    assigneesByTask,
    loading,
    error,
    reload,
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
  } = useKanban(projectId)

  const { show } = useToast()
  const [creatingBoard, setCreatingBoard] = useState(false)
  const [renamingBoardId, setRenamingBoardId] = useState<string | null>(null)
  const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null)
  const [creatingTaskFor, setCreatingTaskFor] = useState<string | null>(null)
  const [openTask, setOpenTask] = useState<Task | null>(null)

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        <BoardColumnSkeleton />
        <BoardColumnSkeleton />
        <BoardColumnSkeleton />
      </div>
    )
  }

  if (error) {
    return <ErrorState message={error} onRetry={reload} />
  }

  const renamingBoard = columns.find((c) => c.board.id === renamingBoardId)?.board
  const creatingTaskBoard = columns.find((c) => c.board.id === creatingTaskFor)?.board
  const deletingBoard = columns.find((c) => c.board.id === deletingBoardId)?.board
  const openTaskColumn = openTask ? columns.find((c) => c.board.id === openTask.boardId) : undefined

  return (
    <div className="space-y-4">
      {canManageBoards(currentUserRole) && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setCreatingBoard(true)}>
            + New board
          </Button>
        </div>
      )}

      {columns.length === 0 ? (
        <EmptyState
          title="Create a board for this project."
          description="Boards are this project's workflow stages — e.g. To Do, In Progress, Done."
          action={
            canManageBoards(currentUserRole) ? (
              <Button size="sm" onClick={() => setCreatingBoard(true)}>
                Create board
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <BoardColumn
              key={column.board.id}
              column={column}
              assigneesByTask={assigneesByTask}
              role={currentUserRole}
              highlighted={column.board.id === highlightBoardId}
              onOpenTask={setOpenTask}
              onCreateTask={() => setCreatingTaskFor(column.board.id)}
              onRename={() => setRenamingBoardId(column.board.id)}
              onDelete={() => setDeletingBoardId(column.board.id)}
              onReorder={(from, to) => reorderWithinColumn(column.board.id, from, to)}
              onMoveTask={(fromBoardId, taskId, toIndex) => moveTaskToBoard(fromBoardId, taskId, column.board.id, toIndex)}
            />
          ))}
        </div>
      )}

      <BoardFormModal
        open={creatingBoard}
        title="New board"
        onClose={() => setCreatingBoard(false)}
        onSubmit={(name) => createBoard(name)}
      />

      {renamingBoard && (
        <BoardFormModal
          open={renamingBoardId !== null}
          title="Rename board"
          initialName={renamingBoard.name}
          onClose={() => setRenamingBoardId(null)}
          onSubmit={(name) => renameBoard(renamingBoard.id, name)}
        />
      )}

      {creatingTaskBoard && (
        <CreateTaskModal
          open={creatingTaskFor !== null}
          boardName={creatingTaskBoard.name}
          onClose={() => setCreatingTaskFor(null)}
          onSubmit={(input) => createTask(creatingTaskBoard.id, input)}
        />
      )}

      {openTask && openTaskColumn && (
        <TaskDetailModal
          open={openTask !== null}
          task={openTask}
          boardName={openTaskColumn.board.name}
          assignees={assigneesByTask[openTask.id] ?? []}
          members={members}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onClose={() => setOpenTask(null)}
          onUpdate={async (input) => {
            const updated = await updateTask(openTask.boardId, openTask.id, input)
            setOpenTask(updated)
          }}
          onDelete={() => deleteTask(openTask.boardId, openTask.id)}
          onAssign={async (userId) => {
            try {
              await assignUser(openTask.boardId, openTask.id, userId)
            } catch (err) {
              show(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.', 'error')
            }
          }}
          onUnassign={async (userId) => {
            try {
              await unassignUser(openTask.boardId, openTask.id, userId)
            } catch (err) {
              show(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.', 'error')
            }
          }}
        />
      )}

      {deletingBoard && (
        <ConfirmDialog
          open={deletingBoardId !== null}
          title="Delete board"
          description={`"${deletingBoard.name}" and every task on it will be permanently removed. This can't be undone.`}
          onConfirm={async () => {
            try {
              await deleteBoard(deletingBoard.id)
              setDeletingBoardId(null)
            } catch (err) {
              show(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.', 'error')
            }
          }}
          onCancel={() => setDeletingBoardId(null)}
        />
      )}
    </div>
  )
}
