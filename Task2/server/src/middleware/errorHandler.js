// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500
  const message = status === 500 ? 'Something went wrong' : err.message

  if (status === 500) {
    console.error(err)
  }

  res.status(status).json({ success: false, message })
}
