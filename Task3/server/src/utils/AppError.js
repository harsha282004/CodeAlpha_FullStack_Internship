// Small, deliberate application error type — not a framework. Code that
// knows exactly what went wrong (a bad request, a missing resource, a
// dependency that's down) throws one of these with a safe, user-facing
// message; anything else reaching the error handler is treated as an
// unexpected bug and never has its raw message sent to the client.
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.isOperational = true
    Error.captureStackTrace(this, this.constructor)
  }
}
