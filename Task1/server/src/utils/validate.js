const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_REGEX.test(email.trim())
}

export function isValidName(name) {
  return typeof name === 'string' && name.trim().length >= 2 && name.trim().length <= 100
}

// bcrypt only hashes the first 72 bytes of input; cap password length so the rest isn't silently ignored.
export function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 72
}
