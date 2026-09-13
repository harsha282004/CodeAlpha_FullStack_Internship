import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import apiRouter from './routes/index.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFoundHandler } from './middleware/notFound.js'

const app = express()

// origin is read from CLIENT_URL rather than "*" so this stays safe to extend
// with `credentials: true` once authenticated requests are introduced.
const corsOptions = {
  origin: env.clientUrl,
}

app.use(cors(corsOptions))
app.use(express.json({ limit: '100kb' }))

app.use('/api', apiRouter)
app.use('/api', notFoundHandler)

app.use(errorHandler)

export default app
