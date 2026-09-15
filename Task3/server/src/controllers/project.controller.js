import {
  validateCreateProjectInput,
  validateUpdateProjectInput,
  validateListProjectsQuery,
} from '../validators/project.validator.js'
import {
  createProject,
  listProjectsForUser,
  getProjectDetail,
  updateProject,
  deleteProject,
} from '../services/project.service.js'

export async function createProjectController(req, res) {
  const input = validateCreateProjectInput(req.body)
  const project = await createProject(req.user.id, input)
  res.status(201).json({ success: true, data: { project } })
}

export async function listProjectsController(req, res) {
  const query = validateListProjectsQuery(req.query)
  const result = await listProjectsForUser(req.user.id, query)
  res.status(200).json({ success: true, data: result })
}

export async function getProjectController(req, res) {
  const project = await getProjectDetail(req.projectMembership.projectId, req.projectMembership.role)
  res.status(200).json({ success: true, data: { project } })
}

export async function updateProjectController(req, res) {
  const update = validateUpdateProjectInput(req.body)
  const project = await updateProject(req.projectMembership.projectId, update, req.projectMembership.role)
  res.status(200).json({ success: true, data: { project } })
}

export async function deleteProjectController(req, res) {
  await deleteProject(req.projectMembership.projectId)
  res.status(200).json({ success: true, message: 'Project deleted' })
}
