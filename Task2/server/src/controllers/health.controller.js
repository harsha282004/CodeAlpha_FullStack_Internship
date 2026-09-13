export function getHealth(req, res) {
  res.json({
    success: true,
    message: 'Connectly API is running',
  })
}
