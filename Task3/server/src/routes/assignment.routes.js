import { Router } from 'express'
import { requireProjectRole } from '../middleware/projectAuth.middleware.js'
import {
  addAssigneeController,
  listAssigneesController,
  getAssignmentStatusController,
  removeAssigneeController,
} from '../controllers/assignment.controller.js'

// mergeParams: true — this router is mounted at '/:taskId/assignees' in
// task.routes.js, so it needs the parent :taskId (and grandparent
// :boardId/:projectId), not just its own :userId.
const router = Router({ mergeParams: true })

// requireAuth, requireProjectMember, requireBoardInProject, and
// requireTaskInBoard are already applied by the parent mounts — every
// assignee route requires project membership and a fully-verified
// project → board → task hierarchy. Per Phase 9 scope, any project member
// may list assignees or check a specific assignment's status; only
// OWNER/ADMIN may add or remove one.
router.post('/', requireProjectRole('OWNER', 'ADMIN'), addAssigneeController)
router.get('/', listAssigneesController)
router.get('/:userId', getAssignmentStatusController)
router.delete('/:userId', requireProjectRole('OWNER', 'ADMIN'), removeAssigneeController)

export default router
