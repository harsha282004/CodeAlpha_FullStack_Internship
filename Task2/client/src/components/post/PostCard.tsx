import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Check, ImageOff, MessageCircle, X } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { Textarea } from '../ui/Textarea'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { PostLikeButton } from './PostLikeButton'
import { PostMenu } from './PostMenu'
import { CommentSheet } from '../comment/CommentSheet'
import { formatRelativeTime } from '../../lib/format'
import { useAuth } from '../../lib/auth/AuthContext'
import { useToast } from '../../lib/toast/ToastContext'
import { deletePost, updatePost } from '../../lib/api/posts'
import { ApiError } from '../../lib/api/client'
import type { Post } from '../../lib/api/types'

const MAX_CONTENT_LENGTH = 5000

interface PostCardProps {
  post: Post & { likedByMe?: boolean }
  onDeleted?: (postId: string) => void
  onUpdated?: (post: Post) => void
}

export function PostCard({ post, onDeleted, onUpdated }: PostCardProps) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const isOwner = user?.id === post.author.id

  const [imageBroken, setImageBroken] = useState(false)
  const [isCommentsOpen, setIsCommentsOpen] = useState(false)
  const [commentCount, setCommentCount] = useState(post.commentCount)

  const [isEditing, setIsEditing] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [draftContent, setDraftContent] = useState(post.content)
  const [draftImageUrl, setDraftImageUrl] = useState(post.imageUrl ?? '')

  function startEdit() {
    setDraftContent(post.content)
    setDraftImageUrl(post.imageUrl ?? '')
    setEditError(null)
    setIsEditing(true)
  }

  async function handleSaveEdit() {
    const trimmed = draftContent.trim()
    if (trimmed.length === 0) {
      setEditError('Post content cannot be empty.')
      return
    }
    if (trimmed.length > MAX_CONTENT_LENGTH) {
      setEditError(`Posts must be ${MAX_CONTENT_LENGTH} characters or fewer.`)
      return
    }

    setIsSaving(true)
    setEditError(null)
    try {
      const { post: updated } = await updatePost(post.id, {
        content: trimmed,
        imageUrl: draftImageUrl.trim().length > 0 ? draftImageUrl.trim() : null,
      })
      onUpdated?.(updated)
      setIsEditing(false)
      showToast({ tone: 'success', message: 'Post updated.' })
    } catch (caught) {
      setEditError(caught instanceof ApiError ? caught.message : 'Could not update post.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleConfirmDelete() {
    setIsDeleting(true)
    try {
      await deletePost(post.id)
      onDeleted?.(post.id)
      showToast({ message: 'Post deleted.' })
    } catch (caught) {
      showToast({
        tone: 'destructive',
        message: caught instanceof ApiError ? caught.message : 'Could not delete post.',
      })
      setIsDeleting(false)
      setIsConfirmingDelete(false)
    }
  }

  return (
    <article className="animate-fade-in border-b border-border px-4 py-4 sm:px-6 sm:py-5">
      <div className="flex items-start gap-3">
        <Link to="/profile/$username" params={{ username: post.author.username }} className="shrink-0">
          <Avatar src={post.author.avatarUrl} name={post.author.name} size="md" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <Link
                to="/profile/$username"
                params={{ username: post.author.username }}
                className="truncate font-semibold text-foreground hover:underline"
              >
                {post.author.name}
              </Link>
              <span className="truncate text-sm text-muted-foreground">@{post.author.username}</span>
              <span className="text-sm text-muted-foreground">&middot;</span>
              <time dateTime={post.createdAt} className="shrink-0 text-sm text-muted-foreground">
                {formatRelativeTime(post.createdAt)}
              </time>
            </div>
            {isOwner && !isEditing && <PostMenu onEdit={startEdit} onDelete={() => setIsConfirmingDelete(true)} />}
          </div>

          {isEditing ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={draftContent}
                onChange={(event) => setDraftContent(event.target.value)}
                maxLength={MAX_CONTENT_LENGTH}
                rows={3}
                aria-label="Edit post content"
              />
              <Input
                value={draftImageUrl}
                onChange={(event) => setDraftImageUrl(event.target.value)}
                placeholder="Image URL (optional)"
                aria-label="Edit image URL"
              />
              {editError && <p className="text-xs font-medium text-destructive">{editError}</p>}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit} isLoading={isSaving}>
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-1 whitespace-pre-wrap text-[0.95rem] leading-relaxed text-foreground">{post.content}</p>

              {post.imageUrl && !imageBroken && (
                <div className="mt-3 overflow-hidden rounded-xl border border-border bg-muted">
                  {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
                  <img
                    src={post.imageUrl}
                    alt="Image attached to this post"
                    loading="lazy"
                    className="max-h-[480px] w-full object-cover"
                    onError={() => setImageBroken(true)}
                  />
                </div>
              )}
              {post.imageUrl && imageBroken && (
                <div className="mt-3 flex h-28 items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                  <ImageOff className="h-5 w-5" aria-hidden="true" />
                  Image unavailable
                </div>
              )}
            </>
          )}

          {isConfirmingDelete && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
              <p className="text-sm font-medium text-foreground">Delete this post? This can&apos;t be undone.</p>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="destructive" onClick={handleConfirmDelete} isLoading={isDeleting}>
                  Delete
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsConfirmingDelete(false)} disabled={isDeleting}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {!isEditing && (
            <div className="-ml-2 mt-2 flex items-center gap-1">
              <PostLikeButton postId={post.id} initialLiked={post.likedByMe} initialCount={post.likeCount} />
              <button
                type="button"
                onClick={() => setIsCommentsOpen(true)}
                aria-label="View comments"
                className="inline-flex min-w-[3.25rem] items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <MessageCircle className="h-[18px] w-[18px]" aria-hidden="true" />
                <span>{commentCount > 0 ? commentCount : ''}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <CommentSheet
        postId={post.id}
        isOpen={isCommentsOpen}
        onClose={() => setIsCommentsOpen(false)}
        onCountChange={setCommentCount}
      />
    </article>
  )
}
