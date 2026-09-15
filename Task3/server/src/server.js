import { env } from './config/env.js'
import { prisma } from './config/prisma.js'
import app from './app.js'

const server = app.listen(env.port, () => {
  console.log(`TaskFlow API started — listening on http://localhost:${env.port}`)
})

server.on('error', (error) => {
  console.error('TaskFlow API failed to start:', error.message)
  process.exit(1)
})

// Stop accepting new connections, let in-flight requests finish, then close
// the Prisma connection pool before exiting — avoids dropping requests or
// leaving open database connections when the process is stopped (Ctrl+C,
// `docker stop`, a process manager restart, etc.).
let isShuttingDown = false

async function shutdown(signal) {
  // A second SIGINT/SIGTERM (e.g. an impatient double Ctrl+C) would otherwise
  // call server.close()/prisma.$disconnect() again mid-shutdown.
  if (isShuttingDown) return
  isShuttingDown = true

  console.log(`${signal} received — shutting down gracefully`)

  server.close(async (err) => {
    if (err) {
      console.error('Error while closing server:', err)
      process.exitCode = 1
    }

    await prisma.$disconnect()
    process.exit()
  })

  // Force-exit if connections don't close in time.
  setTimeout(() => {
    console.error('Forcing shutdown after timeout')
    process.exit(1)
  }, 10_000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
