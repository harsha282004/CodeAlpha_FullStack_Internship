import { Router } from 'express'
import {
  createCommentController,
  listCommentsController,
  getCommentController,
  updateCommentController,
  deleteCommentController,
} from '../controllers/comment.controller.js'

// mergeParams: true — this router is mounted at '/:taskId/comments' in
// task.routes.js, so it needs the parent :taskId (and grandparent
// :boardId/:projectId), not just its own :commentId.
const router = Router({ mergeParams: true })

// requireAuth, requireProjectMember, requireBoardInProject, and
// requireTaskInBoard are already applied by the parent mounts — every
// comment route requires project membership and a fully-verified
// project → board → task hierarchy. Per Phase 10 scope, any project member
// may create/list/view a comment. Update is author-only and delete is
// author-or-OWNER/ADMIN — both checked inside comment.service.js itself
// (they depend on the specific comment's authorId, which requireProjectRole
// has no way to know), not via a route-level role gate.
router.post('/', createCommentController)
router.get('/', listCommentsController)
router.get('/:commentId', getCommentController)
router.patch('/:commentId', updateCommentController)
router.delete('/:commentId', deleteCommentController)

export default router
