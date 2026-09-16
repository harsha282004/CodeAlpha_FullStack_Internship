import { test, expect } from '@playwright/test'

// Objective responsive check (Phase 15.1): rather than eyeballing
// screenshots, this asserts the one concrete failure mode the milestone
// calls out — horizontal page overflow — at each required viewport, on
// both a public page and a fully authenticated page with the Kanban board
// open (the most layout-dense screen in the app).
const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-1280', width: 1280, height: 800 },
  { name: 'laptop-1024', width: 1024, height: 768 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-375', width: 375, height: 812 },
]

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth - window.innerWidth
  })
  expect(overflow).toBeLessThanOrEqual(1) // 1px tolerance for subpixel rounding
}

test.describe('Responsive — no horizontal overflow', () => {
  for (const viewport of VIEWPORTS) {
    test(`login page @ ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('/login')
      await page.waitForLoadState('networkidle')
      await expectNoHorizontalOverflow(page)
    })
  }

  for (const viewport of VIEWPORTS) {
    test(`register page @ ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('/register')
      await page.waitForLoadState('networkidle')
      await expectNoHorizontalOverflow(page)
    })
  }

  test('authenticated app (dashboard, projects, kanban board, modals) at every viewport', async ({ page }) => {
    test.setTimeout(60_000)
    const suffix = Date.now()

    await page.goto('/register')
    await page.waitForLoadState('networkidle')
    await page.getByLabel('Full name').fill('Responsive Test')
    await page.getByLabel('Username').fill(`responsive_${suffix}`)
    await page.getByLabel('Email').fill(`responsive_${suffix}@e2e-test.com`)
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page).toHaveURL(/\/app\/dashboard/)

    await page.goto('/app/projects')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: '+ New project' }).click()
    await page.getByLabel('Project name').fill('Responsive Project')
    await page.getByRole('button', { name: 'Create project' }).click()
    await expect(page.getByRole('heading', { name: 'Responsive Project' })).toBeVisible()

    await page.getByRole('button', { name: '+ New board' }).click()
    await page.getByLabel('Board name').fill('To Do')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('To Do (0)')).toBeVisible()

    await page.getByRole('button', { name: '+ Add task' }).click()
    await page.getByLabel('Title', { exact: true }).fill('Responsive Task')
    await page.getByRole('button', { name: 'Create task' }).click()
    await expect(page.getByText('Responsive Task')).toBeVisible()

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport)
      // Dashboard
      await page.goto('/app/dashboard')
      await page.waitForLoadState('networkidle')
      await expectNoHorizontalOverflow(page)

      // Projects list
      await page.goto('/app/projects')
      await page.waitForLoadState('networkidle')
      await expectNoHorizontalOverflow(page)

      // Project detail + Kanban board (the widest, most layout-dense screen)
      await page.getByRole('heading', { name: 'Responsive Project' }).click()
      await page.waitForLoadState('networkidle')
      await expectNoHorizontalOverflow(page)

      // Task detail modal open
      await page.getByText('Responsive Task').click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await expectNoHorizontalOverflow(page)
      await page.keyboard.press('Escape')
    }
  })
})
