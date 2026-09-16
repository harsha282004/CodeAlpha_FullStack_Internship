import { useState, type DragEvent } from 'react'
import type { Assignee, ProjectRole, Task } from '../../lib/api'
import type { KanbanColumn } from '../../hooks/useKanban'
import { TaskCard } from './TaskCard'
import { Button } from '../ui/Button'
import { Skeleton } from '../ui/Feedback'

interface BoardColumnProps {
  column: KanbanColumn
  assigneesByTask: Record<string, Assignee[]>
  role: ProjectRole
  highlighted?: boolean
  onOpenTask: (task: Task) => void
  onCreateTask: () => void
  onRename: () => void
  onDelete: () => void
  onReorder: (fromIndex: number, toIndex: number) => void
}

const canManageBoards = (role: ProjectRole) => role === 'OWNER' || role === 'ADMIN'

// A single Kanban column — literally one Board (see docs/FRONTEND.md's
// "Board is the column" note). Drag-and-drop only ever reorders within
// this column: dropping a task dragged from a different column is a
// deliberate no-op, since the backend has no way to move a task to a
// different board (task.validator.js's UPDATABLE_FIELDS has no boardId).
export function BoardColumn({
  column,
  assigneesByTask,
  role,
  highlighted,
  onOpenTask,
  onCreateTask,
  onRename,
  onDelete,
  onReorder,
}: BoardColumnProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const { board, tasks } = column

  function handleDragStart(index: number, taskBoardId: string) {
    return (event: DragEvent<HTMLDivElement>) => {
      event.dataTransfer.setData('text/plain', JSON.stringify({ index, boardId: taskBoardId }))
      event.dataTransfer.effectAllowed = 'move'
      setDragIndex(index)
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
  }

  function handleDrop(dropIndex: number) {
    return (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setDragIndex(null)
      let data: { index: number; boardId: string }
      try {
        data = JSON.parse(event.dataTransfer.getData('text/plain'))
      } catch {
        return
      }
      if (data.boardId !== board.id) return // cross-column drop: unsupported, ignored
      onReorder(data.index, dropIndex)
    }
  }

  return (
    <section
      className={`flex w-72 shrink-0 flex-col rounded-xl border bg-slate-100/70 ${
        highlighted ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200'
      }`}
      aria-label={`${board.name} column`}
    >
      <header className="flex items-center justify-between gap-2 px-3 py-3">
        <h3 className="truncate text-sm font-semibold text-slate-800">
          {board.name} <span className="font-normal text-slate-400">({tasks.length})</span>
        </h3>
        {canManageBoards(role) && (
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={onRename}
              aria-label={`Rename ${board.name}`}
              className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Delete ${board.name}`}
              className="rounded p-1 text-slate-400 hover:bg-red-100 hover:text-red-600"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M9 2a1 1 0 00-1 1v1H4.5a.5.5 0 000 1H5v11a2 2 0 002 2h6a2 2 0 002-2V5h.5a.5.5 0 000-1H12V3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        )}
      </header>

      <div className="tf-scroll flex-1 space-y-2 overflow-y-auto px-3 pb-2" style={{ maxHeight: '65vh' }}>
        {tasks.map((task, index) => (
          <TaskCard
            key={task.id}
            task={task}
            assignees={assigneesByTask[task.id] ?? []}
            dragging={dragIndex === index}
            onOpen={() => onOpenTask(task)}
            onDragStart={handleDragStart(index, task.boardId)}
            onDragOver={handleDragOver}
            onDrop={handleDrop(index)}
          />
        ))}
        {tasks.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-400">
            No tasks yet.
          </p>
        )}
      </div>

      <div className="p-2">
        <Button variant="ghost" size="sm" onClick={onCreateTask} className="w-full justify-start">
          + Add task
        </Button>
      </div>
    </section>
  )
}

export function BoardColumnSkeleton() {
  return (
    <div className="flex w-72 shrink-0 flex-col gap-2 rounded-xl border border-slate-200 bg-slate-100/70 p-3">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  )
}
