import { Router } from 'express'
import { requireProjectRole } from '../middleware/projectAuth.middleware.js'
import { requireBoardInProject } from '../middleware/boardAuth.middleware.js'
import {
  createBoardController,
  listBoardsController,
  getBoardController,
  updateBoardController,
  deleteBoardController,
} from '../controllers/board.controller.js'
import taskRoutes from './task.routes.js'

// mergeParams: true — this router is mounted at '/:projectId/boards' in
// project.routes.js, so it needs that parent :projectId param, not just
// its own :boardId.
const router = Router({ mergeParams: true })

// requireAuth and requireProjectMember are already applied by
// project.routes.js at the mount point (every board route requires
// project membership) — so any authenticated member may create/list/view
// a board; only OWNER/ADMIN may restructure one.
router.post('/', createBoardController)
router.get('/', listBoardsController)
router.get('/:boardId', getBoardController)
router.patch('/:boardId', requireProjectRole('OWNER', 'ADMIN'), updateBoardController)
router.delete('/:boardId', requireProjectRole('OWNER', 'ADMIN'), deleteBoardController)

// Task routes need only a valid board-within-this-project (not a specific
// role) as a baseline — requireProjectRole is applied per-route inside
// task.routes.js for the delete operation that's OWNER/ADMIN-only.
router.use('/:boardId/tasks', requireBoardInProject(), taskRoutes)

export default router
