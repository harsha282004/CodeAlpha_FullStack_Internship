import { AppError } from '../utils/AppError.js'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// OWNER is deliberately excluded — there is exactly one OWNER per project
// (whoever created it), and neither of these endpoints is how that role is
// ever assigned. Validating this here, before the request ever reaches a
// service or Prisma, means "assign yourself OWNER via the request body"
// isn't a service-layer concern to remember to block — it structurally
// cannot pass validation.
const ASSIGNABLE_ROLES = new Set(['ADMIN', 'MEMBER'])

const ADD_MEMBER_FIELDS = new Set(['userId', 'role'])
const CHANGE_ROLE_FIELDS = new Set(['role'])

function fail(message) {
  throw new AppError(message, 400, 'VALIDATION_ERROR')
}

function rejectUnsupportedFields(body, allowedFields) {
  const unsupported = Object.keys(body).filter((key) => !allowedFields.has(key))
  if (unsupported.length > 0) {
    fail(`The following field(s) are not supported: ${unsupported.join(', ')}`)
  }
}

export function validateAddMemberInput(body = {}) {
  rejectUnsupportedFields(body, ADD_MEMBER_FIELDS)

  if (typeof body.userId !== 'string' || !UUID_REGEX.test(body.userId)) {
    fail('userId must be a valid user id')
  }

  // Defaults to MEMBER when omitted, per spec.
  let role = 'MEMBER'
  if ('role' in body) {
    if (typeof body.role !== 'string' || !ASSIGNABLE_ROLES.has(body.role)) {
      fail('role must be one of: ADMIN, MEMBER')
    }
    role = body.role
  }

  return { userId: body.userId, role }
}

export function validateChangeRoleInput(body = {}) {
  rejectUnsupportedFields(body, CHANGE_ROLE_FIELDS)

  if (typeof body.role !== 'string' || !ASSIGNABLE_ROLES.has(body.role)) {
    fail('role must be one of: ADMIN, MEMBER')
  }

  return { role: body.role }
}
