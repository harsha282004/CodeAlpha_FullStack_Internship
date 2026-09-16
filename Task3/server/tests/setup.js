import dotenv from 'dotenv'
import path from 'node:path'

// Runs before every test file's own imports (Vitest setupFiles). `override:
// true` is deliberate: server/src/config/env.js does its own `import
// 'dotenv/config'`, which by default only fills in *undefined* keys — so
// loading .env.test here, first and with override, is what guarantees every
// test run talks to the isolated test database/secret rather than whatever
// happens to be in a developer's own server/.env.
dotenv.config({ path: path.resolve(import.meta.dirname, '../.env.test'), override: true })

// Hard safety net, independent of the override above: if DATABASE_URL isn't
// unmistakably the test database, every test file's beforeEach/afterEach
// truncation (see tests/helpers.js's resetDb) would otherwise be capable of
// wiping a real local development database. This throws at import time,
// before a single query runs, rather than trusting configuration silently.
if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes('taskflow_test')) {
  throw new Error(
    'Refusing to run tests: DATABASE_URL does not point at the isolated ' +
      '"taskflow_test" database. Check server/.env.test (copy it from ' +
      '.env.test.example if missing) — tests truncate tables between runs ' +
      'and must never point at a development or production database.',
  )
}
