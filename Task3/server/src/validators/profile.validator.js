import { AppError } from '../utils/AppError.js'

// Same rule, same reasoning, as auth.validator.js's registration username
// check: matched against the trimmed input *before* lowercasing, so a
// mixed-case username is rejected rather than silently rewritten. Kept as
// its own copy here (not imported) since profile update semantics — "this
// field is optional, only validate it if present" — are different enough
// from registration's "every field is required" that sharing one function
// would need its own optionality branching anyway.
const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/
// Deliberately narrow: only http(s) is ever a legitimate avatar URL for this
// app. This is what rejects `javascript:`, `data:`, and every other scheme.
const HTTP_URL_REGEX = /^https?:\/\//i

const NAME_MAX_LENGTH = 100
const BIO_MAX_LENGTH = 500
const AVATAR_URL_MAX_LENGTH = 2048

const SEARCH_QUERY_MAX_LENGTH = 100
const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 10
const MAX_LIMIT = 50

const UPDATABLE_FIELDS = new Set(['name', 'username', 'bio', 'avatarUrl'])

function fail(message) {
  throw new AppError(message, 400, 'VALIDATION_ERROR')
}

function requireString(value, fieldName) {
  if (typeof value !== 'string') {
    fail(`${fieldName} must be a string`)
  }
  return value
}

// Validates a PATCH /api/users/me body. Returns only the fields that were
// actually present (normalized), so the caller can pass the result straight
// to Prisma's `data` without risking overwriting an untouched field with
// undefined — partial-update semantics enforced here, not left to chance.
export function validateUpdateProfileInput(body = {}) {
  const keys = Object.keys(body)
  if (keys.length === 0) {
    fail('Request body must include at least one field to update')
  }

  // Whitelisting the four editable fields is also what makes email,
  // password, id, createdAt, updatedAt, and anything else all rejected the
  // same way — there is no separate "blocklist" to keep in sync.
  const unsupported = keys.filter((key) => !UPDATABLE_FIELDS.has(key))
  if (unsupported.length > 0) {
    fail(`The following field(s) cannot be updated here: ${unsupported.join(', ')}`)
  }

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

  if ('username' in body) {
    const rawUsername = requireString(body.username, 'username').trim()
    if (!USERNAME_REGEX.test(rawUsername)) {
      fail('username must be 3-30 characters and contain only lowercase letters, numbers, and underscores')
    }
    // No-op given the regex above already forced lowercase-only input; kept
    // as explicit, defensive normalization rather than relying on that.
    update.username = rawUsername.toLowerCase()
  }

  if ('bio' in body) {
    const rawBio = requireString(body.bio, 'bio').trim()
    if (rawBio.length > BIO_MAX_LENGTH) {
      fail(`bio must be at most ${BIO_MAX_LENGTH} characters`)
    }
    // An explicitly empty bio clears it rather than being rejected — the
    // same way a real "clear this field" action in a form would behave.
    update.bio = rawBio.length === 0 ? null : rawBio
  }

  if ('avatarUrl' in body) {
    const rawAvatarUrl = requireString(body.avatarUrl, 'avatarUrl').trim()
    if (rawAvatarUrl.length === 0) {
      update.avatarUrl = null
    } else {
      if (rawAvatarUrl.length > AVATAR_URL_MAX_LENGTH) {
        fail(`avatarUrl must be at most ${AVATAR_URL_MAX_LENGTH} characters`)
      }
      if (!HTTP_URL_REGEX.test(rawAvatarUrl)) {
        fail('avatarUrl must be an http:// or https:// URL')
      }
      update.avatarUrl = rawAvatarUrl
    }
  }

  return update
}

// Accepts only a plain positive integer string ("abc", "1.5", "-1", "0",
// and "" are all rejected) — undefined falls back to defaultValue instead.
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

// Validates GET /api/users/search's query string. `q` is required — an
// empty/missing search term is rejected rather than treated as "match
// everyone," which would let this endpoint dump the entire user table.
export function validateSearchQuery(query = {}) {
  if (typeof query.q !== 'string' || query.q.trim().length === 0) {
    fail('q is required')
  }

  const q = query.q.trim()
  if (q.length > SEARCH_QUERY_MAX_LENGTH) {
    fail(`q must be at most ${SEARCH_QUERY_MAX_LENGTH} characters`)
  }

  const page = parsePositiveInt(query.page, 'page', { defaultValue: DEFAULT_PAGE })
  const limit = parsePositiveInt(query.limit, 'limit', { defaultValue: DEFAULT_LIMIT, max: MAX_LIMIT })

  return { q, page, limit }
}
