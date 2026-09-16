import { useEffect, useState } from 'react'
import type { Assignee, ProjectMember, ProjectRole, Task, TaskPriority, UpdateTaskInput } from '../../lib/api'
import { ApiError } from '../../lib/api'
import { useComments } from '../../hooks/useComments'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { InputField, SelectField, TextareaField } from '../ui/FormField'
import { AssigneeManager } from './AssigneeManager'
import { CommentThread } from '../comments/CommentThread'
import { useToast } from '../ui/ToastContext'
import { formatDate } from '../../lib/format'

interface TaskDetailModalProps {
  open: boolean
  task: Task
  boardName: string
  assignees: Assignee[]
  members: ProjectMember[]
  currentUserId: string
  currentUserRole: ProjectRole
  onClose: () => void
  onUpdate: (input: UpdateTaskInput) => Promise<unknown>
  onDelete: () => Promise<unknown>
  onAssign: (userId: string) => Promise<unknown>
  onUnassign: (userId: string) => Promise<unknown>
}

const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

// Any project member may edit a task's content fields (task.routes.js has
// no role gate on PATCH) — only OWNER/ADMIN may delete it or manage
// assignees (deleteTaskController / assignment.routes.js are both
// requireProjectRole('OWNER', 'ADMIN')).
export function TaskDetailModal({
  open,
  task,
  boardName,
  assignees,
  members,
  currentUserId,
  currentUserRole,
  onClose,
  onUpdate,
  onDelete,
  onAssign,
  onUnassign,
}: TaskDetailModalProps) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.slice(0, 10) : '')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { show } = useToast()
  const canManageTask = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN'

  const { comments, loading: commentsLoading, addComment, editComment, removeComment } = useComments(
    task.projectId,
    task.boardId,
    task.id,
  )

  useEffect(() => {
    setTitle(task.title)
    setDescription(task.description ?? '')
    setPriority(task.priority)
    setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : '')
  }, [task])

  async function handleSave() {
    const update: UpdateTaskInput = {}
    if (title.trim() !== task.title) update.title = title.trim()
    if ((description.trim() || null) !== task.description) update.description = description.trim() || null
    if (priority !== task.priority) update.priority = priority
    const nextDueDateIso = dueDate ? new Date(dueDate).toISOString() : null
    if (nextDueDateIso !== task.dueDate) update.dueDate = nextDueDateIso

    if (Object.keys(update).length === 0) return

    setSaving(true)
    try {
      await onUpdate(update)
    } catch (err) {
      show(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    try {
      await onDelete()
      onClose()
    } catch (err) {
      show(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.', 'error')
    }
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={`Task in ${boardName}`} size="lg">
        <div className="space-y-6">
          <div className="space-y-4">
            <InputField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <TextareaField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </SelectField>
              <InputField label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Created {formatDate(task.createdAt)}</span>
              <span>Updated {formatDate(task.updatedAt)}</span>
            </div>
            <div className="flex justify-between">
              {canManageTask ? (
                <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                  Delete task
                </Button>
              ) : (
                <span />
              )}
              <Button size="sm" onClick={handleSave} loading={saving}>
                Save changes
              </Button>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Assignees</h3>
            <AssigneeManager
              assignees={assignees}
              members={members}
              canManage={canManageTask}
              onAssign={onAssign}
              onUnassign={onUnassign}
            />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Comments</h3>
            <CommentThread
              comments={comments}
              loading={commentsLoading}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onAdd={addComment}
              onEdit={editComment}
              onRemove={removeComment}
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete task"
        description={`"${task.title}" and all of its comments will be permanently removed. This can't be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
