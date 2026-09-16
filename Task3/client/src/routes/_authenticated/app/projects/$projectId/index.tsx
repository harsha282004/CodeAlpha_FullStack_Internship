import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from '../../../../../auth/AuthContext'
import { useProject } from '../../../../../hooks/useProject'
import { KanbanBoard } from '../../../../../components/tasks/KanbanBoard'
import { MemberPanel } from '../../../../../components/projects/MemberPanel'
import { Button } from '../../../../../components/ui/Button'
import { ConfirmDialog } from '../../../../../components/ui/ConfirmDialog'
import { Modal } from '../../../../../components/ui/Modal'
import { InputField, TextareaField } from '../../../../../components/ui/FormField'
import { RoleBadge } from '../../../../../components/ui/Badge'
import { ErrorState, PageSpinner } from '../../../../../components/ui/Feedback'
import { ApiError } from '../../../../../lib/api'
import { useToast } from '../../../../../components/ui/ToastContext'

interface ProjectDetailSearch {
  tab?: 'board' | 'members'
}

export const Route = createFileRoute('/_authenticated/app/projects/$projectId/')({
  component: ProjectDetailPage,
  // Lets other screens (e.g. the dashboard's "Invite member" quick action)
  // deep-link straight to the Members tab via ?tab=members instead of
  // landing on the board and making the user click over themselves.
  validateSearch: (search: Record<string, unknown>): ProjectDetailSearch => ({
    tab: search.tab === 'members' ? 'members' : 'board',
  }),
})

const canEditProject = (role?: string) => role === 'OWNER' || role === 'ADMIN'

function ProjectDetailPage() {
  const { projectId } = Route.useParams()
  const { tab: initialTab } = Route.useSearch()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { show } = useToast()
  const {
    project,
    members,
    loading,
    error,
    reload,
    updateProject,
    removeProject,
    addMember,
    removeMember,
    changeMemberRole,
  } = useProject(projectId)

  const [tab, setTab] = useState<'board' | 'members'>(initialTab ?? 'board')
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (loading) return <PageSpinner label="Loading project…" />
  if (error || !project) return <ErrorState message={error ?? 'Project not found.'} onRetry={reload} />
  if (!user) return null

  function openEdit() {
    if (!project) return
    setEditName(project.name)
    setEditDescription(project.description ?? '')
    setEditError(null)
    setEditing(true)
  }

  async function handleSaveEdit() {
    if (!editName.trim()) {
      setEditError('Project name is required.')
      return
    }
    setSavingEdit(true)
    try {
      await updateProject({ name: editName.trim(), description: editDescription.trim() || null })
      setEditing(false)
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleDeleteProject() {
    try {
      await removeProject()
      navigate({ to: '/app/projects' })
    } catch (err) {
      show(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.', 'error')
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
            {project.role && <RoleBadge role={project.role} />}
          </div>
          {project.description && <p className="mt-1 max-w-2xl text-sm text-slate-500">{project.description}</p>}
        </div>

        {canEditProject(project.role) && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={openEdit}>
              Edit project
            </Button>
            {project.role === 'OWNER' && (
              <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                Delete project
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab('board')}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${
            tab === 'board' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Board
        </button>
        <button
          type="button"
          onClick={() => setTab('members')}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${
            tab === 'members' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Members ({members.length})
        </button>
      </div>

      {tab === 'board' ? (
        <KanbanBoard
          projectId={projectId}
          members={members}
          currentUserId={user.id}
          currentUserRole={project.role ?? 'MEMBER'}
        />
      ) : (
        <MemberPanel
          members={members}
          currentUserId={user.id}
          currentUserRole={project.role ?? 'MEMBER'}
          onAdd={addMember}
          onRemove={removeMember}
          onChangeRole={changeMemberRole}
        />
      )}

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit project" size="sm">
        <div className="space-y-4">
          <InputField label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} error={editError} />
          <TextareaField
            label="Description"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setEditing(false)} disabled={savingEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} loading={savingEdit}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete project"
        description={`"${project.name}" and everything in it — boards, tasks, comments — will be permanently deleted. This can't be undone.`}
        onConfirm={handleDeleteProject}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
