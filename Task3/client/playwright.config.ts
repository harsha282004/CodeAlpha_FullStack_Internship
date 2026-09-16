import { defineConfig } from '@playwright/test'

// No `webServer` entry here — the dev server (and the real backend it
// talks to) is started manually before running these tests, exactly the
// way a person would run the app locally. Auto-starting a server from the
// test runner would make it easy to accidentally point these flows at a
// throwaway/mocked instance instead of the real API this milestone
// requires.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
})
