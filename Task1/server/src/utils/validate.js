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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidUuid(value) {
  return typeof value === 'string' && UUID_REGEX.test(value)
}

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function isValidSlug(slug) {
  return typeof slug === 'string' && SLUG_REGEX.test(slug) && slug.length <= 200
}

export function isValidProductName(name) {
  return typeof name === 'string' && name.trim().length > 0 && name.trim().length <= 200
}

export function isValidDescription(description) {
  return (
    typeof description === 'string' &&
    description.trim().length > 0 &&
    description.trim().length <= 2000
  )
}

export function isValidCategory(category) {
  return typeof category === 'string' && category.trim().length > 0 && category.trim().length <= 50
}

export function isValidImageUrl(url) {
  if (typeof url !== 'string') return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

// Guards against floating-point noise (e.g. 19.99 * 100 !== 1999) while still rejecting >2 decimal places.
export function isValidPrice(price) {
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return false
  return Math.abs(Math.round(price * 100) - price * 100) < 1e-6
}

export function isValidStock(stock) {
  return typeof stock === 'number' && Number.isInteger(stock) && stock >= 0
}
