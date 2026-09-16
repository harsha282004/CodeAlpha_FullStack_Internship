import { AppError } from '../utils/AppError.js'

const CONTENT_MAX_LENGTH = 4000

// Whitelisting is also what makes id/taskId/authorId/createdAt/updatedAt
// all rejected the same way — there is no separate blocklist to keep in
// sync. The author always comes from req.user.id (the verified JWT), never
// a body field — a client can never author a comment as someone else.
const CREATABLE_FIELDS = new Set(['content'])
const UPDATABLE_FIELDS = new Set(['content'])

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

function fail(message) {
  throw new AppError(message, 400, 'VALIDATION_ERROR')
}

function requireString(value, fieldName) {
  if (typeof value !== 'string') {
    fail(`${fieldName} must be a string`)
  }
  return value
}

function rejectUnsupportedFields(body, allowedFields, contextMessage) {
  const unsupported = Object.keys(body).filter((key) => !allowedFields.has(key))
  if (unsupported.length > 0) {
    fail(`${contextMessage}: ${unsupported.join(', ')}`)
  }
}

export function validateCreateCommentInput(body = {}) {
  rejectUnsupportedFields(body, CREATABLE_FIELDS, 'The following field(s) are not supported')

  const content = requireString(body.content, 'content').trim()
  if (content.length === 0) {
    fail('content is required')
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    fail(`content must be at most ${CONTENT_MAX_LENGTH} characters`)
  }

  return { content }
}

// Partial update in shape only — content is the only editable field, so in
// practice this either has content or it's an empty body. Kept as a
// separate function (rather than reusing validateCreateCommentInput) so an
// empty body reports the update-specific message, matching the pattern
// established by every other *.validator.js's create/update pair.
export function validateUpdateCommentInput(body = {}) {
  const keys = Object.keys(body)
  if (keys.length === 0) {
    fail('Request body must include at least one field to update')
  }

  rejectUnsupportedFields(body, UPDATABLE_FIELDS, 'The following field(s) cannot be updated here')

  const content = requireString(body.content, 'content').trim()
  if (content.length === 0) {
    fail('content cannot be empty')
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    fail(`content must be at most ${CONTENT_MAX_LENGTH} characters`)
  }

  return { content }
}

// Accepts only a plain positive integer string — undefined falls back to
// defaultValue. Same helper shape used by every other list endpoint's
// pagination in this project.
function parsePositiveInt(rawValue, fieldName, { defaultValue, max } = {}) {
  if (rawValue === undefined) {
    return defaultValue
  }
  if (!/^[1-9][0-9]*$/.test(String(rawValue))) {
    fail(`${fieldName} must be a positive integer`)
  }
  const parsed = Number(rawValue)
  if (max !== undefined && parsed > max) {
    fail(`${fieldName} must be at most ${max}`)
  }
  return parsed
}

export function validateListCommentsQuery(query = {}) {
  const page = parsePositiveInt(query.page, 'page', { defaultValue: DEFAULT_PAGE })
  const limit = parsePositiveInt(query.limit, 'limit', { defaultValue: DEFAULT_LIMIT, max: MAX_LIMIT })
  return { page, limit }
}
