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

// null/undefined/empty all mean "clear the avatar" and are treated as valid;
// a non-empty value must be a well-formed http(s) URL within a sane length.
export function isValidAvatarUrl(avatarUrl) {
  if (avatarUrl === null || avatarUrl === undefined) return true
  if (typeof avatarUrl !== 'string') return false

  const trimmed = avatarUrl.trim()
  if (trimmed.length === 0) return true
  if (trimmed.length > MAX_AVATAR_URL_LENGTH) return false

  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function normalizeAvatarUrl(avatarUrl) {
  if (avatarUrl === null || avatarUrl === undefined) return null
  const trimmed = avatarUrl.trim()
  return trimmed.length > 0 ? trimmed : null
}
