import 'dotenv/config'

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5001,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
}

// Local/dev intentionally has no required vars so the server can start with
// zero setup. Production is where a missing secret or DB URL should stop
// startup immediately instead of failing later in a confusing way.
if (env.nodeEnv === 'production') {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'CLIENT_URL']
  const missing = required.filter((key) => !process.env[key])

  if (missing.length > 0) {
    throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`)
  }
}
