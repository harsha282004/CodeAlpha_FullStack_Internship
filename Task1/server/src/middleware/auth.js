import { verifyAccessToken } from '../utils/jwt.js'
import { AppError } from '../utils/AppError.js'

export function authenticate(req, res, next) {
  const header = req.headers.authorization

  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401))
  }

  const token = header.slice('Bearer '.length).trim()

  try {
    const payload = verifyAccessToken(token)
    req.user = { id: payload.sub }
    next()
  } catch {
    next(new AppError('Invalid or expired token', 401))
  }
}
