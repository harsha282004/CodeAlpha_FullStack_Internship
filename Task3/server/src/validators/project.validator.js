import { AppError } from '../utils/AppError.js'

const NAME_MAX_LENGTH = 100
const DESCRIPTION_MAX_LENGTH = 2000

// Whitelisting is also what makes id/ownerId/createdAt/updatedAt/role all
// rejected the same way on update — there is no separate blocklist to keep
// in sync with the schema.
const CREATABLE_FIELDS = new Set(['name', 'description'])
const UPDATABLE_FIELDS = new Set(['name', 'description'])

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

export function validateCreateProjectInput(body = {}) {
  rejectUnsupportedFields(body, CREATABLE_FIELDS, 'The following field(s) are not supported')

  const name = requireString(body.name, 'name').trim()
  if (name.length === 0) {
    fail('name is required')
  }
  if (name.length > NAME_MAX_LENGTH) {
    fail(`name must be at most ${NAME_MAX_LENGTH} characters`)
  }

  let description = null
  if ('description' in body && body.description !== null) {
    const rawDescription = requireString(body.description, 'description').trim()
    if (rawDescription.length > DESCRIPTION_MAX_LENGTH) {
      fail(`description must be at most ${DESCRIPTION_MAX_LENGTH} characters`)
    }
    description = rawDescription.length === 0 ? null : rawDescription
  }

  return { name, description }
}

// Partial update — only fields actually present in the body end up in the
// returned object, so passing it straight to Prisma's `data` never
// overwrites an untouched field.
export function validateUpdateProjectInput(body = {}) {
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

  if ('description' in body) {
    if (body.description === null) {
      update.description = null
    } else {
      const rawDescription = requireString(body.description, 'description').trim()
      if (rawDescription.length > DESCRIPTION_MAX_LENGTH) {
        fail(`description must be at most ${DESCRIPTION_MAX_LENGTH} characters`)
      }
      update.description = rawDescription.length === 0 ? null : rawDescription
    }
  }

  return update
}

// Accepts only a plain positive integer string — undefined falls back to
// defaultValue. Same helper shape as profile.validator.js's search
// pagination, kept as its own copy since importing across validator
// modules for a five-line helper isn't worth the coupling.
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

export function validateListProjectsQuery(query = {}) {
  const page = parsePositiveInt(query.page, 'page', { defaultValue: DEFAULT_PAGE })
  const limit = parsePositiveInt(query.limit, 'limit', { defaultValue: DEFAULT_LIMIT, max: MAX_LIMIT })
  return { page, limit }
}
