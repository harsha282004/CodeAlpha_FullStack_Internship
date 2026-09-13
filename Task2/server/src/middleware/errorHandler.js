import { env } from '../config/env.js'

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500
  const message = status === 500 ? 'Internal server error' : err.message

  if (status === 500) {
    console.error(err)
  }

  const body = { success: false, message }
  if (env.nodeEnv !== 'production') {
    body.stack = err.stack
  }

  res.status(status).json(body)
}
