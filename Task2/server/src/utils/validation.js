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
