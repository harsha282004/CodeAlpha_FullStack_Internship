import { useState, type DragEvent } from 'react'
import type { Assignee, Task } from '../../lib/api'
import { PriorityBadge } from '../ui/Badge'
import { Avatar } from '../ui/Avatar'
import { timeAgo } from '../../lib/format'

interface TaskCardProps {
  task: Task
  assignees: Assignee[]
  onOpen: () => void
  onDragStart: (event: DragEvent<HTMLDivElement>) => void
  onDragOver: (event: DragEvent<HTMLDivElement>) => void
  onDrop: (event: DragEvent<HTMLDivElement>) => void
  dragging: boolean
}

export function TaskCard({ task, assignees, onOpen, onDragStart, onDragOver, onDrop, dragging }: TaskCardProps) {
  const [dropHover, setDropHover] = useState(false)

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => {
        onDragOver(e)
        setDropHover(true)
      }}
      onDragLeave={() => setDropHover(false)}
      onDrop={(e) => {
        setDropHover(false)
        onDrop(e)
      }}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className={`cursor-pointer space-y-2 rounded-lg border bg-white p-3 text-left shadow-sm transition-all hover:shadow-md ${
        dragging ? 'opacity-40' : ''
      } ${dropHover ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200'}`}
    >
      <p className="text-sm font-semibold leading-snug text-slate-900">{task.title}</p>

      {task.description && (
        <p className="line-clamp-2 text-xs text-slate-500">{task.description}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <PriorityBadge priority={task.priority} />
        {task.dueDate && (
          <span className="text-xs text-slate-400">Due {timeAgo(task.dueDate)}</span>
        )}
      </div>

      {assignees.length > 0 && (
        <div className="flex -space-x-1.5 pt-1">
          {assignees.slice(0, 4).map((assignee) => (
            <Avatar key={assignee.id} name={assignee.name} avatarUrl={assignee.avatarUrl} size="sm" />
          ))}
          {assignees.length > 4 && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">
              +{assignees.length - 4}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
