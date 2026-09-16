import { AppError } from '../utils/AppError.js'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// The only accepted field. taskId/projectId/boardId always come from the
// URL (never a body field), and there is no role or requester-identity
// field here at all — the requester is always req.user.id from the
// verified JWT.
const ADD_ASSIGNEE_FIELDS = new Set(['userId'])

function fail(message) {
  throw new AppError(message, 400, 'VALIDATION_ERROR')
}

export function validateAddAssigneeInput(body = {}) {
  const unsupported = Object.keys(body).filter((key) => !ADD_ASSIGNEE_FIELDS.has(key))
  if (unsupported.length > 0) {
    fail(`The following field(s) are not supported: ${unsupported.join(', ')}`)
  }

  // Covers "missing entirely" and "empty body" the same way — both leave
  // body.userId as undefined, which fails this check.
  if (typeof body.userId !== 'string' || !UUID_REGEX.test(body.userId)) {
    fail('userId must be a valid user id')
  }

  return { userId: body.userId }
}
