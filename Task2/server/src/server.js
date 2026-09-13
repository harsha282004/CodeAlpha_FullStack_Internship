import { env } from './config/env.js'
import app from './app.js'

const server = app.listen(env.port, () => {
  console.log(`Connectly API started — listening on http://localhost:${env.port}`)
})

server.on('error', (error) => {
  console.error('Connectly API failed to start:', error.message)
  process.exit(1)
})
