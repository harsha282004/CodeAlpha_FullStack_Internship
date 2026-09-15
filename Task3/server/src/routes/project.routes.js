import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requireProjectMember, requireProjectRole } from '../middleware/projectAuth.middleware.js'
import {
  createProjectController,
  listProjectsController,
  getProjectController,
  updateProjectController,
  deleteProjectController,
} from '../controllers/project.controller.js'
import {
  addMemberController,
  listMembersController,
  removeMemberController,
  changeMemberRoleController,
} from '../controllers/membership.controller.js'
import boardRoutes from './board.routes.js'

const router = Router()

// Every project route requires authentication — applied once here rather
// than repeated on each route below.
router.use(requireAuth)

router.post('/', createProjectController)
router.get('/', listProjectsController)

router.get('/:projectId', requireProjectMember(), getProjectController)
router.patch('/:projectId', requireProjectMember(), requireProjectRole('OWNER', 'ADMIN'), updateProjectController)
router.delete('/:projectId', requireProjectMember(), requireProjectRole('OWNER'), deleteProjectController)

router.post(
  '/:projectId/members',
  requireProjectMember(),
  requireProjectRole('OWNER', 'ADMIN'),
  addMemberController,
)
router.get('/:projectId/members', requireProjectMember(), listMembersController)
router.delete(
  '/:projectId/members/:userId',
  requireProjectMember(),
  requireProjectRole('OWNER', 'ADMIN'),
  removeMemberController,
)
router.patch(
  '/:projectId/members/:userId',
  requireProjectMember(),
  requireProjectRole('OWNER'),
  changeMemberRoleController,
)

// Board routes need only membership (not a specific role) to create/list/
// view — requireProjectRole is applied per-route inside board.routes.js
// for the update/delete operations that are OWNER/ADMIN-only.
router.use('/:projectId/boards', requireProjectMember(), boardRoutes)

export default router
