import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import apiRouter from './routes/index.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFoundHandler } from './middleware/notFound.js'

const app = express()

app.use(cors({ origin: env.clientUrl }))
app.use(express.json())

app.use('/api', apiRouter)
app.use('/api', notFoundHandler)

app.use(errorHandler)

export default app
