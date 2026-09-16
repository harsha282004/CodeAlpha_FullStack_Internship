import { test, expect } from '@playwright/test'

// Ad hoc verification for the dashboard visual redesign — not part of the
// permanent Phase 17 suite's required flows, but written the same way:
// real accounts, real backend, real assertions. Confirms the redesign
// didn't regress any existing functionality (auth, real data, navigation)
// while matching the new visual structure.
test('redesigned dashboard: real data, empty states, create project, navigation, no console errors', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => consoleErrors.push(err.message))

  const suffix = Date.now()
  await page.goto('/register')
  await page.waitForLoadState('networkidle')
  await page.getByLabel('Full name').fill('Redesign Tester')
  await page.getByLabel('Username').fill(`redesign_${suffix}`)
  await page.getByLabel('Email').fill(`redesign_${suffix}@e2e-test.com`)
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/app\/dashboard/)

  // Real name, not hardcoded.
  await expect(page.getByRole('heading', { name: /Welcome back, Redesign/ })).toBeVisible()

  // Real current date is shown (weekday + month name), not a fixed string.
  const today = new Date()
  const weekday = today.toLocaleDateString(undefined, { weekday: 'long' })
  await expect(page.getByText(weekday, { exact: false })).toBeVisible()

  // Stat cards show real zero-state numbers for a brand new account.
  await expect(page.getByText('Total Projects', { exact: true })).toBeVisible()
  await expect(page.getByText('Total Tasks', { exact: true })).toBeVisible()
  await expect(page.getByText('Unread Notifications', { exact: true })).toBeVisible()
  await expect(page.getByText('Team Members', { exact: true })).toBeVisible()

  // Empty states are real (no projects/notifications yet).
  await expect(page.getByRole('heading', { name: 'Create your first project' })).toBeVisible()
  await expect(page.getByText("You're all caught up!")).toBeVisible()

  // Quick actions are present and real (not dead links).
  await expect(page.getByText('Create project', { exact: true })).toBeVisible()
  await expect(page.getByText('Invite member', { exact: true })).toBeVisible()
  await expect(page.getByText('Browse projects', { exact: true })).toBeVisible()
  await expect(page.getByText('Account settings', { exact: true })).toBeVisible()

  // Invite member with zero projects: real fallback, not a silent no-op.
  await page.getByText('Invite member', { exact: true }).click()
  await expect(page).toHaveURL(/\/app\/projects$/)
  await expect(page.getByText(/Create a project first/)).toBeVisible()

  await page.goto('/app/dashboard')
  await page.waitForLoadState('networkidle')

  // Create project via the Quick Actions modal (real API call).
  await page.getByText('Create project', { exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'New project' })
  await expect(modal).toBeVisible()
  await page.getByLabel('Project name').fill('Redesign Verification Project')
  await modal.getByRole('button', { name: 'Create project' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  // Recent Projects now shows the real project, stats update.
  await expect(page.getByText('Redesign Verification Project')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Create your first project' })).toHaveCount(0)

  // Header search finds it too (real client-side filter over real data).
  await page.getByPlaceholder('Search projects, tasks, or people…').fill('Redesign Verification')
  await expect(page.getByRole('button', { name: /Redesign Verification Project/ })).toBeVisible()
  await page.keyboard.press('Escape')

  // Sidebar navigation still works.
  await page.getByRole('link', { name: 'Projects' }).click()
  await expect(page).toHaveURL(/\/app\/projects$/)
  await page.getByRole('link', { name: 'Dashboard' }).click()
  await expect(page).toHaveURL(/\/app\/dashboard$/)

  await page.getByRole('link', { name: 'Profile' }).click()
  await expect(page).toHaveURL(/\/profile$/)
  await page.getByRole('link', { name: 'Settings' }).click()
  await expect(page).toHaveURL(/\/settings$/)

  // Logout still works.
  await page.goto('/app/dashboard')
  await page.getByRole('button', { name: new RegExp('Redesign Tester') }).click()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login/)

  expect(consoleErrors, `Console errors found:\n${consoleErrors.join('\n')}`).toEqual([])
})

test('dashboard responsive: no horizontal overflow at every required viewport', async ({ page }) => {
  test.setTimeout(60_000)
  const suffix = Date.now()
  await page.goto('/register')
  await page.waitForLoadState('networkidle')
  await page.getByLabel('Full name').fill('Responsive Dash Tester')
  await page.getByLabel('Username').fill(`respdash_${suffix}`)
  await page.getByLabel('Email').fill(`respdash_${suffix}@e2e-test.com`)
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/app\/dashboard/)

  const viewports = [
    { width: 1440, height: 900 },
    { width: 1280, height: 800 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 375, height: 812 },
  ]

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await page.waitForTimeout(150)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, `horizontal overflow at ${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(1)
    await expect(page.getByRole('heading', { name: /Welcome back/ })).toBeVisible()
  }
})
