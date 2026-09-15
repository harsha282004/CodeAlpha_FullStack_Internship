import { AppError } from '../utils/AppError.js'

// Lowercase-only by construction — checked against the trimmed input as
// typed, *before* any case-folding. If normalization ran first, a username
// like "UserName" would silently become "username" and pass; validating the
// original casing instead means mixed-case input is rejected outright, so a
// user finds out immediately rather than having their chosen username
// silently rewritten.
const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/
// A simple, well-established "good enough" shape check — not a full RFC 5322
// parser, which would be a rabbit hole with no real security benefit here.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const NAME_MAX_LENGTH = 100
const EMAIL_MAX_LENGTH = 254
const PASSWORD_MIN_LENGTH = 8
// bcrypt itself silently truncates input past 72 bytes — validating this
// ourselves means an over-length password is rejected with a clear 400
// instead of being quietly cut down to a weaker effective password.
const PASSWORD_MAX_LENGTH = 72

function fail(message) {
  throw new AppError(message, 400, 'VALIDATION_ERROR')
}

function requireNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(`${fieldName} must be a non-empty string`)
  }
  return value
}

export function validateRegisterInput(body = {}) {
  const name = requireNonEmptyString(body.name, 'name').trim()
  if (name.length > NAME_MAX_LENGTH) {
    fail(`name must be at most ${NAME_MAX_LENGTH} characters`)
  }

  const rawUsername = requireNonEmptyString(body.username, 'username').trim()
  if (!USERNAME_REGEX.test(rawUsername)) {
    fail('username must be 3-30 characters and contain only lowercase letters, numbers, and underscores')
  }
  // No-op given the regex above already forced lowercase-only input; kept
  // as explicit, defensive normalization rather than relying on that.
  const username = rawUsername.toLowerCase()

  const email = requireNonEmptyString(body.email, 'email').trim().toLowerCase()
  if (email.length > EMAIL_MAX_LENGTH) {
    fail('email is too long')
  }
  if (!EMAIL_REGEX.test(email)) {
    fail('email must be a valid email address')
  }

  const password = requireNonEmptyString(body.password, 'password')
  if (password.length < PASSWORD_MIN_LENGTH) {
    fail(`password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    fail(`password must be at most ${PASSWORD_MAX_LENGTH} characters`)
  }

  return { name, username, email, password }
}

export function validateLoginInput(body = {}) {
  const email = requireNonEmptyString(body.email, 'email').trim().toLowerCase()
  const password = requireNonEmptyString(body.password, 'password')

  return { email, password }
}
