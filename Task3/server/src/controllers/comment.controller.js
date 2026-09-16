import {
  validateCreateCommentInput,
  validateUpdateCommentInput,
  validateListCommentsQuery,
} from '../validators/comment.validator.js'
import { createComment, listComments, getComment, updateComment, deleteComment } from '../services/comment.service.js'

export async function createCommentController(req, res) {
  const input = validateCreateCommentInput(req.body)
  const comment = await createComment(req.task.projectId, req.task.id, req.user.id, input)
  res.status(201).json({ success: true, data: { comment } })
}

export async function listCommentsController(req, res) {
  const query = validateListCommentsQuery(req.query)
  const result = await listComments(req.task.id, query)
  res.status(200).json({ success: true, data: result })
}

export async function getCommentController(req, res) {
  const comment = await getComment(req.task.id, req.params.commentId)
  res.status(200).json({ success: true, data: { comment } })
}

export async function updateCommentController(req, res) {
  const input = validateUpdateCommentInput(req.body)
  const comment = await updateComment(req.task.projectId, req.task.id, req.params.commentId, req.user.id, input)
  res.status(200).json({ success: true, data: { comment } })
}

export async function deleteCommentController(req, res) {
  await deleteComment(
    req.task.projectId,
    req.task.id,
    req.params.commentId,
    req.user.id,
    req.projectMembership.role,
  )
  res.status(200).json({ success: true, message: 'Comment deleted' })
}
