// Minimal request logger for local development. Deliberately not morgan or
// another logging framework — a foundation this small doesn't need one, and
// it never logs headers/body, so there's no risk of a secret (JWT, password)
// ending up in stdout. Only mounted outside production (see app.js), where a
// hosting platform's own access logs take over.
export function requestLogger(req, res, next) {
  const startedAt = process.hrtime.bigint()

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms`)
  })

  next()
}
