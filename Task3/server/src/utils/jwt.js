import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { AppError } from './AppError.js'

function requireSecret() {
  if (!env.jwtSecret) {
    // A missing secret is a deployment/config mistake, not something a
    // client did — fail with a clean 500 instead of letting jsonwebtoken
    // throw its own raw "secretOrPrivateKey must have a value" error.
    throw new AppError('Server is not configured for authentication', 500, 'AUTH_NOT_CONFIGURED')
  }
  return env.jwtSecret
}

// Minimal payload by design: just the subject (user id). Everything else
// about the user (email, role, profile) can change after the token is
// issued, so it's looked up fresh from the database whenever it matters
// rather than trusted from a token that might be hours old.
export function signAccessToken(userId) {
  return jwt.sign({ sub: userId }, requireSecret(), { expiresIn: env.jwtExpiresIn })
}

// Throws (jsonwebtoken's TokenExpiredError / JsonWebTokenError) for any
// invalid, expired, or tampered token — the caller (auth middleware) turns
// every failure mode into the same generic 401, so this function is never
// responsible for deciding what the client gets to see.
export function verifyAccessToken(token) {
  return jwt.verify(token, requireSecret())
}
