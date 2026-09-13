const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Lowercase letters, numbers, and underscores only — keeps usernames safe to
// drop directly into a profile URL.
const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/

export function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : email
}

export function normalizeUsername(username) {
  return typeof username === 'string' ? username.trim().toLowerCase() : username
}

export function isValidName(name) {
  return typeof name === 'string' && name.trim().length > 0 && name.trim().length <= 100
}

export function isValidUsername(username) {
  return typeof username === 'string' && USERNAME_REGEX.test(username)
}

export function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_REGEX.test(email)
}

// bcrypt only hashes the first 72 bytes of input; cap password length so the
// rest isn't silently ignored.
export function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 72
}

const MAX_BIO_LENGTH = 500
const MAX_AVATAR_URL_LENGTH = 2048
const MAX_POST_CONTENT_LENGTH = 5000
const MAX_POST_IMAGE_URL_LENGTH = 2048

// null/undefined are accepted here because both mean "no bio" — the caller
// decides whether that clears an existing value.
export function isValidBio(bio) {
  return bio === null || bio === undefined || (typeof bio === 'string' && bio.trim().length <= MAX_BIO_LENGTH)
}

export function normalizeBio(bio) {
  if (bio === null || bio === undefined) return null
  const trimmed = bio.trim()
  return trimmed.length > 0 ? trimmed : null
}

// Shared by avatarUrl and post imageUrl: null/undefined/empty all mean
// "clear the image" and are treated as valid; a non-empty value must be a
// well-formed http(s) URL within a sane length.
function isValidNullableHttpUrl(value, maxLength) {
  if (value === null || value === undefined) return true
  if (typeof value !== 'string') return false

  const trimmed = value.trim()
  if (trimmed.length === 0) return true
  if (trimmed.length > maxLength) return false

  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function normalizeNullableUrl(value) {
  if (value === null || value === undefined) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function isValidAvatarUrl(avatarUrl) {
  return isValidNullableHttpUrl(avatarUrl, MAX_AVATAR_URL_LENGTH)
}

export function normalizeAvatarUrl(avatarUrl) {
  return normalizeNullableUrl(avatarUrl)
}

export function isValidPostImageUrl(imageUrl) {
  return isValidNullableHttpUrl(imageUrl, MAX_POST_IMAGE_URL_LENGTH)
}

export function normalizePostImageUrl(imageUrl) {
  return normalizeNullableUrl(imageUrl)
}

export function isValidPostContent(content) {
  return (
    typeof content === 'string' && content.trim().length > 0 && content.trim().length <= MAX_POST_CONTENT_LENGTH
  )
}

export function normalizePostContent(content) {
  return typeof content === 'string' ? content.trim() : content
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidUuid(value) {
  return typeof value === 'string' && UUID_REGEX.test(value)
}

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 10
const MAX_LIMIT = 50

// Returns { page, limit } or null if the query params are malformed —
// the caller decides what error that becomes.
export function parsePagination(query = {}) {
  let page = DEFAULT_PAGE
  if (query.page !== undefined) {
    page = Number(query.page)
    if (!Number.isInteger(page) || page < 1) return null
  }

  let limit = DEFAULT_LIMIT
  if (query.limit !== undefined) {
    limit = Number(query.limit)
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) return null
  }

  return { page, limit }
}
