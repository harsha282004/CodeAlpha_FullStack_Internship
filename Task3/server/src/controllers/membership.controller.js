import { validateAddMemberInput, validateChangeRoleInput } from '../validators/membership.validator.js'
import { addMember, listMembers, removeMember, changeMemberRole } from '../services/membership.service.js'

export async function addMemberController(req, res) {
  const input = validateAddMemberInput(req.body)
  const member = await addMember(req.projectMembership.projectId, input)
  res.status(201).json({ success: true, data: { member } })
}

export async function listMembersController(req, res) {
  const members = await listMembers(req.projectMembership.projectId)
  res.status(200).json({ success: true, data: { members } })
}

export async function removeMemberController(req, res) {
  await removeMember(req.projectMembership.projectId, req.params.userId)
  res.status(200).json({ success: true, message: 'Member removed' })
}

export async function changeMemberRoleController(req, res) {
  const { role } = validateChangeRoleInput(req.body)
  const member = await changeMemberRole(req.projectMembership.projectId, req.params.userId, role)
  res.status(200).json({ success: true, data: { member } })
}
