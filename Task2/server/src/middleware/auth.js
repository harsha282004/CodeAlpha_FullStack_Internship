import { verifyAccessToken } from '../utils/jwt.js'

function authError(message) {
  const error = new Error(message)
  error.status = 401
  return error
}

export function authenticate(req, res, next) {
  const header = req.headers.authorization

  if (!header || !header.startsWith('Bearer ')) {
    return next(authError('Authentication required'))
  }

  const token = header.slice('Bearer '.length).trim()
  if (!token) {
    return next(authError('Authentication required'))
  }

  try {
    const payload = verifyAccessToken(token)
    req.user = { id: payload.sub }
    next()
  } catch {
    // Covers invalid signature, malformed token, and expiry alike — never
    // reveal which one it was.
    next(authError('Invalid or expired token'))
  }
}
