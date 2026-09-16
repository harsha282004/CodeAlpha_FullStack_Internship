import { validateAddAssigneeInput } from '../validators/assignment.validator.js'
import { addAssignee, listAssignees, getAssignmentStatus, removeAssignee } from '../services/assignment.service.js'

export async function addAssigneeController(req, res) {
  const { userId } = validateAddAssigneeInput(req.body)
  const assignee = await addAssignee(req.task.projectId, req.task.id, userId)
  res.status(201).json({ success: true, data: { assignee } })
}

export async function listAssigneesController(req, res) {
  const assignees = await listAssignees(req.task.id)
  res.status(200).json({ success: true, data: { assignees } })
}

export async function getAssignmentStatusController(req, res) {
  const assignee = await getAssignmentStatus(req.task.id, req.params.userId)
  res.status(200).json({ success: true, data: { assignee } })
}

export async function removeAssigneeController(req, res) {
  await removeAssignee(req.task.id, req.params.userId)
  res.status(200).json({ success: true, message: 'Assignee removed' })
}
