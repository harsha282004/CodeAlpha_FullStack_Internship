import {
  createComment as createCommentService,
  listComments as listCommentsService,
  updateComment as updateCommentService,
  deleteComment as deleteCommentService,
} from '../services/comment.service.js'

export async function createComment(req, res, next) {
  try {
    const comment = await createCommentService(req.user.id, req.params.postId, req.body)
    res.status(201).json({ success: true, message: 'Comment created', data: { comment } })
  } catch (error) {
    next(error)
  }
}

export async function listComments(req, res, next) {
  try {
    const { comments, pagination } = await listCommentsService(req.params.postId, req.query)
    res.json({ success: true, data: { comments, pagination } })
  } catch (error) {
    next(error)
  }
}

export async function updateComment(req, res, next) {
  try {
    const comment = await updateCommentService(req.user.id, req.params.commentId, req.body)
    res.json({ success: true, message: 'Comment updated', data: { comment } })
  } catch (error) {
    next(error)
  }
}

export async function deleteComment(req, res, next) {
  try {
    await deleteCommentService(req.user.id, req.params.commentId)
    res.json({ success: true, data: { message: 'Comment deleted successfully' } })
  } catch (error) {
    next(error)
  }
}
