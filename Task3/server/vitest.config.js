import { defineConfig } from 'vitest/config'

// Integration tests share one real Postgres database (taskflow_test — see
// .env.test.example) and each test file truncates the tables it touches
// before running. Running test *files* in parallel would let two files
// truncate/write the same tables concurrently and produce flaky, order-
// dependent failures — so files run sequentially (fileParallelism: false).
// Tests *within* a file still run in the order they're written, which is
// what every file here already assumes.
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
})
