import { useState, type FormEvent } from 'react'
import type { Comment, ProjectRole } from '../../lib/api'
import { ApiError } from '../../lib/api'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useToast } from '../ui/ToastContext'
import { timeAgo } from '../../lib/format'

interface CommentThreadProps {
  comments: Comment[]
  loading: boolean
  currentUserId: string
  currentUserRole: ProjectRole
  onAdd: (content: string) => Promise<unknown>
  onEdit: (commentId: string, content: string) => Promise<unknown>
  onRemove: (commentId: string) => Promise<unknown>
}

const MAX_LENGTH = 4000

// Edit is strictly author-only (no role bypasses it); delete permits the
// author OR an OWNER/ADMIN moderating the project — this asymmetry mirrors
// the backend exactly (see docs/COMMENTS.md) rather than inventing a
// simpler-but-wrong single permission check.
export function CommentThread({
  comments,
  loading,
  currentUserId,
  currentUserRole,
  onAdd,
  onEdit,
  onRemove,
}: CommentThreadProps) {
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const { show } = useToast()

  const canModerate = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN'

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    const content = draft.trim()
    if (!content) return
    setPosting(true)
    try {
      await onAdd(content)
      setDraft('')
    } catch (err) {
      show(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.', 'error')
    } finally {
      setPosting(false)
    }
  }

  async function handleSaveEdit(commentId: string) {
    const content = editDraft.trim()
    if (!content) return
    try {
      await onEdit(commentId, content)
      setEditingId(null)
    } catch (err) {
      show(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.', 'error')
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDeleteId) return
    try {
      await onRemove(pendingDeleteId)
    } catch (err) {
      show(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.', 'error')
    } finally {
      setPendingDeleteId(null)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="space-y-2">
        <label htmlFor="new-comment" className="sr-only">
          Add a comment
        </label>
        <textarea
          id="new-comment"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={MAX_LENGTH}
          rows={2}
          placeholder="Write a comment…"
          className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:border-indigo-500"
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" loading={posting} disabled={!draft.trim()}>
            Comment
          </Button>
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-slate-400">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-slate-400">No comments yet.</p>
      ) : (
        <ul className="space-y-3" aria-label="Comments">
          {comments.map((comment) => {
            const isAuthor = comment.author.id === currentUserId
            const isEditing = editingId === comment.id
            return (
              <li key={comment.id} className="flex gap-2">
                <Avatar name={comment.author.name} avatarUrl={comment.author.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1 rounded-lg bg-slate-50 px-3 py-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <span className="text-sm font-semibold text-slate-800">{comment.author.name}</span>
                    <span className="text-xs text-slate-400">{timeAgo(comment.createdAt)}</span>
                  </div>

                  {isEditing ? (
                    <div className="mt-1 space-y-2">
                      <textarea
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        maxLength={MAX_LENGTH}
                        rows={2}
                        className="block w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveEdit(comment.id)}>
                          Save
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-slate-700">
                      {comment.content}
                    </p>
                  )}

                  {!isEditing && (isAuthor || canModerate) && (
                    <div className="mt-1 flex gap-3">
                      {isAuthor && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(comment.id)
                            setEditDraft(comment.content)
                          }}
                          className="text-xs font-medium text-slate-400 hover:text-indigo-600"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(comment.id)}
                        className="text-xs font-medium text-slate-400 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete comment"
        description="This comment will be permanently removed. This can't be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  )
}
