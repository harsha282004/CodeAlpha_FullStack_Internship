import { AppError } from '../utils/AppError.js'

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

function fail(message) {
  throw new AppError(message, 400, 'VALIDATION_ERROR')
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

export function validateListNotificationsQuery(query = {}) {
  const page = parsePositiveInt(query.page, 'page', { defaultValue: DEFAULT_PAGE })
  const limit = parsePositiveInt(query.limit, 'limit', { defaultValue: DEFAULT_LIMIT, max: MAX_LIMIT })
  return { page, limit }
}
