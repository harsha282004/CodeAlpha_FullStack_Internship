import { useState, type FormEvent } from 'react'
import { Image as ImageIcon, X } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { Textarea } from '../ui/Textarea'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { createPost } from '../../lib/api/posts'
import { ApiError } from '../../lib/api/client'
import { useAuth } from '../../lib/auth/AuthContext'
import { useToast } from '../../lib/toast/ToastContext'
import type { Post } from '../../lib/api/types'

const MAX_LENGTH = 5000

interface PostComposerProps {
  onCreated: (post: Post) => void
}

export function PostComposer({ onCreated }: PostComposerProps) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [isExpanded, setIsExpanded] = useState(false)
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user) return null

  function collapse() {
    setIsExpanded(false)
    setContent('')
    setImageUrl('')
    setError(null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = content.trim()
    if (trimmed.length === 0) {
      setError('Write something before posting.')
      return
    }
    if (trimmed.length > MAX_LENGTH) {
      setError(`Posts must be ${MAX_LENGTH} characters or fewer.`)
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const { post } = await createPost({
        content: trimmed,
        imageUrl: imageUrl.trim().length > 0 ? imageUrl.trim() : undefined,
      })
      onCreated(post)
      collapse()
      showToast({ tone: 'success', message: 'Post published.' })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not publish your post.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="border-b border-border px-4 py-4 sm:px-6">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <Avatar src={user.avatarUrl} name={user.name} size="md" className="mt-0.5" />
        <div className="min-w-0 flex-1 space-y-3">
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onFocus={() => setIsExpanded(true)}
            placeholder="What's on your mind?"
            aria-label="Post content"
            maxLength={MAX_LENGTH}
            rows={isExpanded ? 3 : 1}
            className={isExpanded ? 'text-[0.95rem]' : 'min-h-0 text-[0.95rem]'}
          />

          {isExpanded && (
            <div className="animate-fade-in space-y-3">
              <Input
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                placeholder="Image URL (optional)"
                leadingIcon={<ImageIcon className="h-4 w-4" aria-hidden="true" />}
                aria-label="Image URL"
              />
              {error && <p className="text-xs font-medium text-destructive">{error}</p>}
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`text-xs ${content.length > MAX_LENGTH ? 'text-destructive' : 'text-muted-foreground'}`}
                >
                  {content.length} / {MAX_LENGTH}
                </span>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={collapse} disabled={isSubmitting}>
                    <X className="h-4 w-4" aria-hidden="true" />
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" isLoading={isSubmitting} disabled={content.trim().length === 0}>
                    Post
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
