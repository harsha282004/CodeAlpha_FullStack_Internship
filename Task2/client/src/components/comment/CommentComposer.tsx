import { useState, type FormEvent } from 'react'
import { Send } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { createComment } from '../../lib/api/comments'
import { ApiError } from '../../lib/api/client'
import { useAuth } from '../../lib/auth/AuthContext'
import type { Comment } from '../../lib/api/types'

const MAX_LENGTH = 2000

interface CommentComposerProps {
  postId: string
  onCreated: (comment: Comment) => void
}

export function CommentComposer({ postId, onCreated }: CommentComposerProps) {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user) return null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = content.trim()
    if (trimmed.length === 0) {
      setError('Write something first.')
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      const { comment } = await createComment(postId, { content: trimmed })
      onCreated(comment)
      setContent('')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not post comment.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="shrink-0 border-t border-border bg-surface-elevated p-3">
      <div className="flex items-end gap-2">
        <Avatar src={user.avatarUrl} name={user.name} size="sm" />
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          maxLength={MAX_LENGTH}
          rows={1}
          placeholder="Write a comment"
          aria-label="Write a comment"
          className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-input bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary"
        />
        <Button
          type="submit"
          size="sm"
          isLoading={isSubmitting}
          disabled={content.trim().length === 0}
          aria-label="Post comment"
          className="!px-3.5"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      {error && <p className="mt-1.5 pl-11 text-xs font-medium text-destructive">{error}</p>}
    </form>
  )
}
