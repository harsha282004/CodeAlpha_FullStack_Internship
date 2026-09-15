import { Prisma } from '@prisma/client'
import { env } from '../config/env.js'
import { AppError } from '../utils/AppError.js'

// Resolves any thrown value into a safe { statusCode, message, code } triple.
// Returns null for anything unrecognized, which the handler below treats as
// an unexpected bug (generic message, full detail only in the server log).
function resolveKnownError(err) {
  if (err instanceof AppError) {
    return { statusCode: err.statusCode, message: err.message, code: err.code }
  }

  // express.json() throws a SyntaxError with `.type` set for malformed JSON,
  // and a PayloadTooLargeError (type 'entity.too.large') for oversized
  // bodies. Both already carry the right HTTP status; we just give them a
  // clean, predictable message/code instead of the raw parser text.
  if (err.type === 'entity.parse.failed') {
    return { statusCode: 400, message: 'Malformed JSON in request body', code: 'INVALID_JSON' }
  }
  if (err.type === 'entity.too.large') {
    return { statusCode: 413, message: 'Request payload is too large', code: 'PAYLOAD_TOO_LARGE' }
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return { statusCode: 409, message: 'A record with this value already exists', code: 'DUPLICATE_RECORD' }
    }
    if (err.code === 'P2025') {
      return { statusCode: 404, message: 'Record not found', code: 'NOT_FOUND' }
    }
    return { statusCode: 400, message: 'Invalid database request', code: 'DATABASE_REQUEST_ERROR' }
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    return { statusCode: 400, message: 'Invalid request data', code: 'VALIDATION_ERROR' }
  }

  // A plain Error with an explicit, non-500 status (e.g. the health service's
  // 503) is deliberate application signaling, not a bug — safe to pass
  // through as-is. An explicit 500 is not trusted this way: only AppError
  // (above) is allowed to speak for a 500, since an ordinary bug can also
  // end up with `.status`/`.statusCode` coincidentally set to 500.
  const explicitStatus = err.statusCode || err.status
  if (typeof explicitStatus === 'number' && explicitStatus !== 500) {
    return { statusCode: explicitStatus, message: err.message, code: err.code }
  }

  return null
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const resolved = resolveKnownError(err) ?? {
    statusCode: 500,
    message: 'Something went wrong',
    code: 'INTERNAL_ERROR',
  }

  // Full detail (including stack) is always logged server-side for 5xx —
  // never sent in the response body, in any environment.
  if (resolved.statusCode >= 500) {
    console.error(err)
  } else if (env.nodeEnv !== 'production') {
    console.warn(`[${resolved.statusCode}] ${req.method} ${req.originalUrl} — ${resolved.message}`)
  }

  res.status(resolved.statusCode).json({
    success: false,
    message: resolved.message,
    ...(resolved.code ? { code: resolved.code } : {}),
  })
}
