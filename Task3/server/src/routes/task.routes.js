import { Router } from 'express'
import { requireProjectRole } from '../middleware/projectAuth.middleware.js'
import {
  createTaskController,
  listTasksController,
  getTaskController,
  updateTaskController,
  deleteTaskController,
} from '../controllers/task.controller.js'

// mergeParams: true — this router is mounted at '/:boardId/tasks' in
// board.routes.js, so it needs both that parent :boardId and the
// grandparent :projectId, not just its own :taskId.
const router = Router({ mergeParams: true })

// requireAuth, requireProjectMember, and requireBoardInProject are already
// applied by the parent mounts — every task route requires project
// membership and a board that genuinely belongs to this project. Per
// Phase 8 scope, any project member may create/list/view/update a task
// (task-content collaboration is open to the whole team); only OWNER/ADMIN
// may delete one. Assignee-specific permissions are Phase 9.
router.post('/', createTaskController)
router.get('/', listTasksController)
router.get('/:taskId', getTaskController)
router.patch('/:taskId', updateTaskController)
router.delete('/:taskId', requireProjectRole('OWNER', 'ADMIN'), deleteTaskController)

export default router
