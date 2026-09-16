import { useState } from 'react'
import type { AssignableRole, ProjectMember, ProjectRole, PublicUser } from '../../lib/api'
import { ApiError, usersApi } from '../../lib/api'
import { Avatar } from '../ui/Avatar'
import { RoleBadge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Modal } from '../ui/Modal'
import { SelectField } from '../ui/FormField'
import { useToast } from '../ui/ToastContext'

interface MemberPanelProps {
  members: ProjectMember[]
  currentUserId: string
  currentUserRole: ProjectRole
  onAdd: (userId: string, role?: AssignableRole) => Promise<unknown>
  onRemove: (userId: string) => Promise<unknown>
  onChangeRole: (userId: string, role: AssignableRole) => Promise<unknown>
}

// Member management (Phase 14.6). Adding uses the real user-search API
// (usersApi.search) — never a hardcoded user list — and only OWNER may
// change roles (removal is OWNER/ADMIN, matching project.routes.js's
// exact role gates: requireProjectRole('OWNER') for role changes,
// requireProjectRole('OWNER', 'ADMIN') for add/remove). OWNER itself is
// never offered as an assignable role — the backend rejects it outright
// (see membership.validator.js's ASSIGNABLE_ROLES).
export function MemberPanel({ members, currentUserId, currentUserRole, onAdd, onRemove, onChangeRole }: MemberPanelProps) {
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PublicUser[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<PublicUser | null>(null)
  const [selectedRole, setSelectedRole] = useState<AssignableRole>('MEMBER')
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { show } = useToast()

  const canManageMembers = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN'
  const canChangeRoles = currentUserRole === 'OWNER'
  const existingIds = new Set(members.map((m) => m.id))

  async function handleSearch(value: string) {
    setQuery(value)
    setSelectedUser(null)
    if (value.trim().length === 0) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      const { users } = await usersApi.search(value.trim())
      setResults(users.filter((u) => !existingIds.has(u.id)))
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  async function handleAdd() {
    if (!selectedUser) return
    setBusy(true)
    try {
      await onAdd(selectedUser.id, selectedRole)
      setAdding(false)
      setQuery('')
      setResults([])
      setSelectedUser(null)
      setSelectedRole('MEMBER')
    } catch (err) {
      show(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove() {
    if (!pendingRemoveId) return
    try {
      await onRemove(pendingRemoveId)
    } catch (err) {
      show(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.', 'error')
    } finally {
      setPendingRemoveId(null)
    }
  }

  async function handleRoleChange(userId: string, role: AssignableRole) {
    try {
      await onChangeRole(userId, role)
    } catch (err) {
      show(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.', 'error')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Members ({members.length})</h3>
        {canManageMembers && (
          <Button size="sm" onClick={() => setAdding(true)}>
            + Add member
          </Button>
        )}
      </div>

      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {members.map((member) => (
          <li key={member.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={member.name} avatarUrl={member.avatarUrl} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{member.name}</p>
                <p className="truncate text-xs text-slate-400">@{member.username}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canChangeRoles && member.role !== 'OWNER' ? (
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.id, e.target.value as AssignableRole)}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                  aria-label={`Change role for ${member.name}`}
                >
                  <option value="MEMBER">MEMBER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              ) : (
                <RoleBadge role={member.role} />
              )}

              {canManageMembers && member.role !== 'OWNER' && member.id !== currentUserId && (
                <button
                  type="button"
                  onClick={() => setPendingRemoveId(member.id)}
                  className="text-xs font-medium text-slate-400 hover:text-red-600"
                >
                  Remove
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add member" size="sm">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="member-search" className="block text-sm font-medium text-slate-700">
              Search by name or username
            </label>
            <input
              id="member-search"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="e.g. alice"
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              autoFocus
            />
          </div>

          {searching && <p className="text-sm text-slate-400">Searching…</p>}

          {!searching && query.trim().length > 0 && (
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {results.length === 0 ? (
                <p className="text-sm text-slate-400">No matching users.</p>
              ) : (
                results.map((candidate) => (
                  <li key={candidate.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedUser(candidate)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50 ${
                        selectedUser?.id === candidate.id ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <Avatar name={candidate.name} avatarUrl={candidate.avatarUrl} size="sm" />
                      <span>{candidate.name}</span>
                      <span className="text-xs text-slate-400">@{candidate.username}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}

          {selectedUser && (
            <SelectField
              label="Role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as AssignableRole)}
            >
              <option value="MEMBER">MEMBER</option>
              <option value="ADMIN">ADMIN</option>
            </SelectField>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setAdding(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!selectedUser} loading={busy}>
              Add to project
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingRemoveId !== null}
        title="Remove member"
        description="They will lose access to this project. Their existing comments and task history are kept."
        confirmLabel="Remove"
        onConfirm={handleRemove}
        onCancel={() => setPendingRemoveId(null)}
      />
    </div>
  )
}
