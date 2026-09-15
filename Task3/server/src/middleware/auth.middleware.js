import { verifyAccessToken } from '../utils/jwt.js'
import { AppError } from '../utils/AppError.js'

const BEARER_PREFIX = 'Bearer '

// One generic error for every failure mode below (missing header, wrong
// scheme, empty token, malformed token, expired token, bad signature) — the
// client never learns *which* of these happened, only that it isn't
// authenticated. Distinguishing them in the response would help an attacker
// narrow down what to try next for no benefit to a legitimate caller.
function authenticationRequiredError() {
  return new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED')
}

// Establishes *authentication* only — that the bearer of this token is user
// `payload.sub`. It deliberately does not query the database: the JWT
// signature is sufficient proof of identity on its own. Later phases that
// need up-to-date user data or *authorization* (roles, project membership)
// look it up themselves from `req.user.id`.
export function requireAuth(req, res, next) {
  const header = req.get('authorization')

  if (!header || !header.startsWith(BEARER_PREFIX)) {
    return next(authenticationRequiredError())
  }

  const token = header.slice(BEARER_PREFIX.length).trim()
  if (!token) {
    return next(authenticationRequiredError())
  }

  let payload
  try {
    payload = verifyAccessToken(token)
  } catch {
    // Expired, malformed, tampered, wrong signature — all land here and all
    // get the same generic response.
    return next(authenticationRequiredError())
  }

  if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
    return next(authenticationRequiredError())
  }

  req.user = { id: payload.sub }
  next()
}
