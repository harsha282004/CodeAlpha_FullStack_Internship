import { useCallback, useEffect, useState } from 'react'
import { ApiError, commentsApi, type Comment } from '../lib/api'
import { useSocketEvent } from '../realtime/SocketContext'

interface CommentPayload {
  projectId: string
  taskId: string
  comment: Comment
}
interface CommentDeletedPayload {
  projectId: string
  taskId: string
  commentId: string
}

// A single task's comment thread — created fresh each time a task detail
// view opens (see components/tasks/TaskDetailModal.tsx), not shared
// globally, since only one task's comments are ever visible at a time.
export function useComments(projectId: string, boardId: string, taskId: string) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { comments: list } = await commentsApi.list(projectId, boardId, taskId, 1, 50)
      setComments(list)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [projectId, boardId, taskId])

  useEffect(() => {
    load()
  }, [load])

  useSocketEvent<CommentPayload>('comment:created', (p) => {
    if (p.taskId !== taskId) return
    setComments((current) => (current.some((c) => c.id === p.comment.id) ? current : [...current, p.comment]))
  })
  useSocketEvent<CommentPayload>('comment:updated', (p) => {
    if (p.taskId !== taskId) return
    setComments((current) => current.map((c) => (c.id === p.comment.id ? p.comment : c)))
  })
  useSocketEvent<CommentDeletedPayload>('comment:deleted', (p) => {
    if (p.taskId !== taskId) return
    setComments((current) => current.filter((c) => c.id !== p.commentId))
  })

  const addComment = useCallback(
    async (content: string) => {
      const { comment } = await commentsApi.create(projectId, boardId, taskId, content)
      setComments((current) => (current.some((c) => c.id === comment.id) ? current : [...current, comment]))
      return comment
    },
    [projectId, boardId, taskId],
  )

  const editComment = useCallback(
    async (commentId: string, content: string) => {
      const { comment } = await commentsApi.update(projectId, boardId, taskId, commentId, content)
      setComments((current) => current.map((c) => (c.id === commentId ? comment : c)))
    },
    [projectId, boardId, taskId],
  )

  const removeComment = useCallback(
    async (commentId: string) => {
      await commentsApi.remove(projectId, boardId, taskId, commentId)
      setComments((current) => current.filter((c) => c.id !== commentId))
    },
    [projectId, boardId, taskId],
  )

  return { comments, loading, error, addComment, editComment, removeComment }
}
