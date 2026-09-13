import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { getLikeStatus, likePost, unlikePost } from '../../lib/api/likes'
import { ApiError } from '../../lib/api/client'
import { useAuth } from '../../lib/auth/AuthContext'
import { useToast } from '../../lib/toast/ToastContext'
import { formatCount } from '../../lib/format'

interface PostLikeButtonProps {
  postId: string
  /** Feed/explore already know this; a plain Post from /api/posts doesn't
   *  (that endpoint has no auth), so it's resolved lazily below instead. */
  initialLiked?: boolean
  initialCount: number
}

export function PostLikeButton({ postId, initialLiked, initialCount }: PostLikeButtonProps) {
  const { status } = useAuth()
  const { showToast } = useToast()
  const [liked, setLiked] = useState(initialLiked ?? false)
  const [count, setCount] = useState(initialCount)
  const [likedKnown, setLikedKnown] = useState(initialLiked !== undefined)
  const [isSyncing, setIsSyncing] = useState(false)
  const [justLiked, setJustLiked] = useState(false)

  useEffect(() => {
    if (likedKnown || status !== 'authenticated') return
    let cancelled = false

    getLikeStatus(postId)
      .then((result) => {
        if (cancelled) return
        setLiked(result.liked)
        setCount(result.likeCount)
        setLikedKnown(true)
      })
      .catch(() => {
        // Leave the optimistic default (not liked) rather than blocking the card on an error.
      })

    return () => {
      cancelled = true
    }
  }, [likedKnown, postId, status])

  async function handleClick() {
    if (status !== 'authenticated') {
      showToast({ message: 'Log in to like posts.' })
      return
    }
    if (isSyncing) return

    const previousLiked = liked
    const previousCount = count
    const nextLiked = !previousLiked

    setLiked(nextLiked)
    setLikedKnown(true)
    setCount(previousCount + (nextLiked ? 1 : -1))
    setIsSyncing(true)
    if (nextLiked) {
      setJustLiked(true)
      window.setTimeout(() => setJustLiked(false), 320)
    }

    try {
      const result = nextLiked ? await likePost(postId) : await unlikePost(postId)
      setLiked(result.liked)
      setCount(result.likeCount)
    } catch (error) {
      setLiked(previousLiked)
      setCount(previousCount)
      showToast({
        tone: 'destructive',
        message: error instanceof ApiError ? error.message : 'Could not update your like. Please try again.',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={liked}
      aria-label={liked ? 'Unlike post' : 'Like post'}
      className={`inline-flex min-w-[3.25rem] items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors active:scale-95 ${
        liked ? 'text-destructive' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <Heart
        className={`h-[18px] w-[18px] ${liked ? 'fill-destructive' : ''} ${justLiked ? 'animate-pop' : ''}`}
        aria-hidden="true"
      />
      <span>{likedKnown && count > 0 ? formatCount(count) : ''}</span>
    </button>
  )
}
