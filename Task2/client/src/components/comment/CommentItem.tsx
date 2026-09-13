import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { Textarea } from '../ui/Textarea'
import { Button } from '../ui/Button'
import { formatRelativeTime } from '../../lib/format'
import { useAuth } from '../../lib/auth/AuthContext'
import { deleteComment, updateComment } from '../../lib/api/comments'
import { ApiError } from '../../lib/api/client'
import { useToast } from '../../lib/toast/ToastContext'
import type { Comment } from '../../lib/api/types'

interface CommentItemProps {
  comment: Comment
  onDeleted: (commentId: string) => void
  onUpdated: (comment: Comment) => void
}

export function CommentItem({ comment, onDeleted, onUpdated }: CommentItemProps) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const isOwner = user?.id === comment.author.id
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(comment.content)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    const trimmed = draft.trim()
    if (trimmed.length === 0) {
      setError('Comment cannot be empty.')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      const { comment: updated } = await updateComment(comment.id, { content: trimmed })
      onUpdated(updated)
      setIsEditing(false)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not update comment.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await deleteComment(comment.id)
      onDeleted(comment.id)
      showToast({ message: 'Comment deleted.' })
    } catch (caught) {
      showToast({
        tone: 'destructive',
        message: caught instanceof ApiError ? caught.message : 'Could not delete comment.',
      })
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex gap-3 py-3">
      <Link to="/profile/$username" params={{ username: comment.author.username }} className="shrink-0">
        <Avatar src={comment.author.avatarUrl} name={comment.author.name} size="sm" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-1.5">
          <Link
            to="/profile/$username"
            params={{ username: comment.author.username }}
            className="text-sm font-semibold text-foreground hover:underline"
          >
            {comment.author.name}
          </Link>
          <span className="text-xs text-muted-foreground">@{comment.author.username}</span>
          <span className="text-xs text-muted-foreground">&middot;</span>
          <time dateTime={comment.createdAt} className="text-xs text-muted-foreground">
            {formatRelativeTime(comment.createdAt)}
          </time>
        </div>

        {isEditing ? (
          <div className="mt-1.5 space-y-2">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={2000}
              rows={2}
              error={error ?? undefined}
              aria-label="Edit comment"
              className="min-h-0 text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} isLoading={isSaving}>
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsEditing(false)
                  setDraft(comment.content)
                  setError(null)
                }}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{comment.content}</p>
        )}

        {isOwner && !isEditing && (
          <div className="mt-1 flex gap-3">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Pencil className="h-3 w-3" aria-hidden="true" />
              Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" />
              {isDeleting ? 'Deleting' : 'Delete'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
