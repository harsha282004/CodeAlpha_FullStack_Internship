import { useState } from 'react'
import type { Assignee, ProjectMember } from '../../lib/api'
import { ApiError } from '../../lib/api'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { useToast } from '../ui/ToastContext'

interface AssigneeManagerProps {
  assignees: Assignee[]
  members: ProjectMember[]
  canManage: boolean
  onAssign: (userId: string) => Promise<unknown>
  onUnassign: (userId: string) => Promise<unknown>
}

// Assignment is restricted to this project's own members — the picker's
// options come from `members` (already fetched project membership), never
// a raw user search, so a non-member can never even be selected here (the
// backend would reject it anyway, but the UI shouldn't offer it as a
// choice in the first place).
export function AssigneeManager({ assignees, members, canManage, onAssign, onUnassign }: AssigneeManagerProps) {
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const { show } = useToast()

  const assignedIds = new Set(assignees.map((a) => a.id))
  const candidates = members.filter((m) => !assignedIds.has(m.id))

  async function handleAssign() {
    if (!selected) return
    setBusy(true)
    try {
      await onAssign(selected)
      setSelected('')
    } catch (err) {
      show(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleUnassign(userId: string) {
    setBusy(true)
    try {
      await onUnassign(userId)
    } catch (err) {
      show(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {assignees.map((assignee) => (
          <li key={assignee.id} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Avatar name={assignee.name} avatarUrl={assignee.avatarUrl} size="sm" />
              <span className="text-sm text-slate-700">{assignee.name}</span>
              <span className="text-xs text-slate-400">@{assignee.username}</span>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() => handleUnassign(assignee.id)}
                disabled={busy}
                className="text-xs font-medium text-slate-400 hover:text-red-600"
              >
                Remove
              </button>
            )}
          </li>
        ))}
        {assignees.length === 0 && <p className="text-sm text-slate-400">No one is assigned yet.</p>}
      </ul>

      {canManage && candidates.length > 0 && (
        <div className="flex gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="block w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            aria-label="Select a project member to assign"
          >
            <option value="">Select a member…</option>
            {candidates.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} (@{m.username})
              </option>
            ))}
          </select>
          <Button size="sm" onClick={handleAssign} disabled={!selected} loading={busy}>
            Assign
          </Button>
        </div>
      )}
    </div>
  )
}
