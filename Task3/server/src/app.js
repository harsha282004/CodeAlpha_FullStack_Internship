import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { env } from './config/env.js'
import apiRouter from './routes/index.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFoundHandler } from './middleware/notFound.js'
import { requestLogger } from './middleware/requestLogger.js'

const app = express()

// origin is read from CLIENT_URL rather than "*" so this stays safe to extend
// with `credentials: true` once authenticated requests are introduced.
// Nothing here sends cookies yet, so `credentials` is intentionally left
// unset rather than turned on "just in case" — enabling it prematurely would
// widen what a misconfigured origin could do for no current benefit.
const corsOptions = {
  origin: env.clientUrl,
}

app.use(
  helmet({
    // The frontend is served from a different origin/port by design (Vite
    // dev server vs. this API), so helmet's default same-origin resource
    // policy would otherwise cause browsers to block the frontend's own
    // fetch() calls to this API even though CORS allows them.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
)
app.use(cors(corsOptions))

// Dev-only request log. Never mounted in production, where a hosting
// platform's own access logs cover this instead.
if (env.nodeEnv !== 'production') {
  app.use(requestLogger)
}

app.use(express.json({ limit: '100kb' }))

app.use('/api', apiRouter)
app.use('/api', notFoundHandler)

app.use(errorHandler)

export default app
