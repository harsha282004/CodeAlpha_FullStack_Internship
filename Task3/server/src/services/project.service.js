import { prisma } from '../config/prisma.js'
import { AppError } from '../utils/AppError.js'
import { toProjectSummary } from '../utils/project.js'

const PROJECT_SELECT = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
}

// A project must never exist without its OWNER membership row — the
// transaction guarantees both writes commit together or neither does, so a
// crash between them can't leave an ownerless project behind.
export async function createProject(ownerId, { name, description }) {
  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: { name, description, ownerId },
      select: PROJECT_SELECT,
    })
    await tx.projectMember.create({
      data: { projectId: created.id, userId: ownerId, role: 'OWNER' },
    })
    return created
  })

  return toProjectSummary(project, { role: 'OWNER', memberCount: 1 })
}

// Only ever queries through ProjectMember, scoped to this user — a project
// this user doesn't belong to is never even considered, let alone filtered
// out afterward in JavaScript.
export async function listProjectsForUser(userId, { page, limit }) {
  const where = { userId }

  const [total, memberships] = await Promise.all([
    prisma.projectMember.count({ where }),
    prisma.projectMember.findMany({
      where,
      select: {
        role: true,
        project: {
          select: { ...PROJECT_SELECT, _count: { select: { members: true } } },
        },
      },
      orderBy: { project: { createdAt: 'desc' } },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return {
    projects: memberships.map((m) =>
      toProjectSummary(m.project, { role: m.role, memberCount: m.project._count.members }),
    ),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

// Called only after requireProjectMember has already confirmed both that
// the project exists and that the caller belongs to it — a miss here would
// mean the project was deleted in the instant between that check and this
// query, which is treated the same way (404) rather than a generic 500.
export async function getProjectDetail(projectId, role) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ...PROJECT_SELECT, _count: { select: { members: true } } },
  })

  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND')
  }

  return toProjectSummary(project, { role, memberCount: project._count.members })
}

export async function updateProject(projectId, update, role) {
  const project = await prisma.project.update({
    where: { id: projectId },
    data: update,
    select: PROJECT_SELECT,
  })

  return toProjectSummary(project, { role })
}

// ProjectMember, Board, Task, and this project's own Notification/Activity
// rows all cascade at the schema level (onDelete: Cascade — see
// schema.prisma / DATABASE_SCHEMA.md), so a single DELETE here is already
// atomic and leaves nothing orphaned; no application-level transaction is
// needed to coordinate multiple deletes by hand.
export async function deleteProject(projectId) {
  await prisma.project.delete({ where: { id: projectId } })
}
