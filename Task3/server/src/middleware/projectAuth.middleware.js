import { prisma } from '../config/prisma.js'
import { AppError } from '../utils/AppError.js'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function projectNotFoundError() {
  return new AppError('Project not found', 404, 'PROJECT_NOT_FOUND')
}

function notAProjectMemberError() {
  return new AppError('You are not a member of this project', 403, 'NOT_A_PROJECT_MEMBER')
}

function insufficientRoleError() {
  return new AppError('You do not have permission to perform this action', 403, 'INSUFFICIENT_PROJECT_ROLE')
}

// Looks up the caller's membership for :projectId — from PostgreSQL, never
// from anything the client supplied — and attaches it as
// req.projectMembership = { projectId, role } for requireProjectRole and
// the controllers/services downstream. Mirrors requireAuth's own pattern:
// establish one fact (here, "what is this user's relationship to this
// project") by querying the database, not by trusting a claim.
//
// Deliberately distinguishes "project doesn't exist" (404) from "project
// exists, you're just not in it" (403) — a non-member should learn nothing
// about a project's existence beyond what a generic 404 already tells
// everyone, but a genuinely missing project shouldn't be reported as if it
// existed and merely excluded them.
export function requireProjectMember() {
  return async function requireProjectMemberMiddleware(req, res, next) {
    try {
      const { projectId } = req.params

      if (!UUID_REGEX.test(projectId)) {
        // A malformed id can never match a real project — treat it as
        // "not found" rather than letting Prisma throw a validation error
        // for what would otherwise surface as a differently-shaped 400.
        return next(projectNotFoundError())
      }

      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: req.user.id } },
        select: { role: true },
      })

      if (membership) {
        req.projectMembership = { projectId, role: membership.role }
        return next()
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true },
      })

      if (!project) {
        return next(projectNotFoundError())
      }

      return next(notAProjectMemberError())
    } catch (error) {
      next(error)
    }
  }
}

// Must run after requireProjectMember (needs req.projectMembership already
// set). Checks the role looked up from the database against an allow-list —
// never a role supplied by the request itself.
export function requireProjectRole(...allowedRoles) {
  return function requireProjectRoleMiddleware(req, res, next) {
    if (!req.projectMembership || !allowedRoles.includes(req.projectMembership.role)) {
      return next(insufficientRoleError())
    }
    next()
  }
}
