import { AppError } from '../utils/AppError.js'

const NAME_MAX_LENGTH = 100

// Whitelisting is also what makes projectId/id/createdAt/updatedAt all
// rejected the same way — there is no separate blocklist to keep in sync.
// Notably, `projectId` is never accepted here: the parent project always
// comes from the URL (`:projectId`), never a body field, so a board can't
// be pointed at a different project than the one its route says it's in.
const CREATABLE_FIELDS = new Set(['name', 'position'])
const UPDATABLE_FIELDS = new Set(['name', 'position'])

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

// Boards are ordered by this value ascending, so it must be a plain
// non-negative integer — anything else (negative, fractional, non-numeric)
// would break that ordering rather than just look wrong.
function validatePosition(value) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    fail('position must be a non-negative integer')
  }
  return value
}

export function validateCreateBoardInput(body = {}) {
  rejectUnsupportedFields(body, CREATABLE_FIELDS, 'The following field(s) are not supported')

  const name = requireString(body.name, 'name').trim()
  if (name.length === 0) {
    fail('name is required')
  }
  if (name.length > NAME_MAX_LENGTH) {
    fail(`name must be at most ${NAME_MAX_LENGTH} characters`)
  }

  const input = { name }
  // Omitted entirely when not supplied — the service determines the next
  // position automatically, so the caller never has to calculate it.
  if ('position' in body) {
    input.position = validatePosition(body.position)
  }
  return input
}

// Partial update — only fields actually present in the body end up in the
// returned object, so passing it straight to Prisma's `data` never
// overwrites an untouched field.
export function validateUpdateBoardInput(body = {}) {
  const keys = Object.keys(body)
  if (keys.length === 0) {
    fail('Request body must include at least one field to update')
  }

  rejectUnsupportedFields(body, UPDATABLE_FIELDS, 'The following field(s) cannot be updated here')

  const update = {}

  if ('name' in body) {
    const name = requireString(body.name, 'name').trim()
    if (name.length === 0) {
      fail('name cannot be empty')
    }
    if (name.length > NAME_MAX_LENGTH) {
      fail(`name must be at most ${NAME_MAX_LENGTH} characters`)
    }
    update.name = name
  }

  if ('position' in body) {
    update.position = validatePosition(body.position)
  }

  return update
}
