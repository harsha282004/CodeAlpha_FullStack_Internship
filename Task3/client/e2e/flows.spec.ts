import { test, expect, type Browser } from '@playwright/test'

// Real browser flows against the real Express API + PostgreSQL + Socket.IO
// stack (no mocks) — the milestone's own FLOW 1-7. Each test registers
// fresh accounts (a unique suffix per run) rather than relying on seeded
// data, so this suite can be re-run repeatedly without collisions.
const suffix = Date.now()

async function registerAndLogin(browser: Browser, label: string) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto('/register')
  // TanStack Start server-renders this page first; React hydration attaches
  // event listeners a moment later. Waiting for the button to actually be
  // enabled (React's initial render disables nothing here, but this also
  // waits out network activity from hydration's own JS chunk requests)
  // avoids a fill() racing ahead of hydration and being silently dropped.
  await page.waitForLoadState('networkidle')

  await page.getByLabel('Full name').fill(`${label} Test`)
  await page.getByLabel('Username').fill(`${label}_${suffix}`)
  await page.getByLabel('Email').fill(`${label}_${suffix}@e2e-test.com`)
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page).toHaveURL(/\/app\/dashboard/)
  await expect(page.getByRole('heading', { name: /Welcome back/ })).toBeVisible()
  return { context, page }
}

test.describe('TaskFlow end-to-end flows', () => {
  test('FLOW 1 — register, login redirect, dashboard shows real data', async ({ browser }) => {
    const { context, page } = await registerAndLogin(browser, 'flow1owner')
    await expect(page.getByText('Projects', { exact: true }).first()).toBeVisible()
    await context.close()
  })

  test('FLOW 2-6 — project, board, task, assignment, comments, notifications, realtime', async ({ browser }) => {
    test.setTimeout(90_000)
    const owner = await registerAndLogin(browser, 'flow2owner')
    const member = await registerAndLogin(browser, 'flow2member')

    // --- FLOW 2: create project -> open project -> create board -> create task
    await owner.page.goto('/app/projects')
    await owner.page.waitForLoadState('networkidle')
    await owner.page.getByRole('button', { name: '+ New project' }).click()
    await owner.page.getByLabel('Project name').fill('E2E Project')
    await owner.page.getByRole('button', { name: 'Create project' }).click()
    await expect(owner.page.getByRole('heading', { name: 'E2E Project' })).toBeVisible()

    const projectUrl = owner.page.url()

    await owner.page.getByRole('button', { name: '+ New board' }).click()
    await owner.page.getByLabel('Board name').fill('To Do')
    await owner.page.getByRole('button', { name: 'Save' }).click()
    await expect(owner.page.getByText('To Do (0)')).toBeVisible()

    await owner.page.getByRole('button', { name: '+ Add task' }).click()
    await owner.page.getByLabel('Title', { exact: true }).fill('E2E Task')
    await owner.page.getByRole('button', { name: 'Create task' }).click()
    await expect(owner.page.getByText('E2E Task')).toBeVisible()

    // --- FLOW 3: add member -> assign task -> verify assignment
    await owner.page.getByRole('button', { name: /Members/ }).click()
    await owner.page.getByRole('button', { name: '+ Add member' }).click()
    await owner.page.getByLabel('Search by name or username').fill(`flow2member_${suffix}`)
    await owner.page.getByText(`@flow2member_${suffix}`).click()
    await owner.page.getByRole('button', { name: 'Add to project' }).click()
    await expect(owner.page.getByText(`@flow2member_${suffix}`)).toBeVisible()

    await owner.page.getByRole('button', { name: /^Board$/ }).click()
    await owner.page.getByText('E2E Task').click()
    await owner.page
      .getByLabel('Select a project member to assign')
      .selectOption({ label: `flow2member Test (@flow2member_${suffix})` })
    await owner.page.getByRole('button', { name: 'Assign' }).click()
    await expect(owner.page.getByText('flow2member Test')).toBeVisible()

    // --- FLOW 4: add comment -> edit comment -> delete comment
    // Scoped to the comment's own <li> throughout — "Edit"/"Delete" as bare
    // button names would otherwise also substring-match "Edit project" /
    // "Delete project" elsewhere on this same page.
    await owner.page.getByPlaceholder('Write a comment…').fill('Initial comment')
    await owner.page.getByRole('button', { name: 'Comment' }).click()
    // Scoped to the named "Comments" list (not the assignee list, which is
    // also a <ul>/<li> on this same screen) — there is only one comment on
    // this task, so its <li> is addressed by position, not by a text
    // filter that would stop matching once "Edit" mode swaps the rendered
    // <p> for a <textarea> (whose value isn't matched by hasText).
    const commentItem = owner.page.getByRole('list', { name: 'Comments' }).getByRole('listitem').first()
    await expect(commentItem).toContainText('Initial comment')

    await commentItem.getByRole('button', { name: 'Edit' }).click()
    await commentItem.locator('textarea').fill('Edited comment')
    await commentItem.getByRole('button', { name: 'Save' }).click()
    await expect(commentItem).toContainText('Edited comment')

    await commentItem.getByRole('button', { name: 'Delete' }).click()
    await owner.page.getByRole('dialog', { name: 'Delete comment' }).getByRole('button', { name: 'Delete' }).click()
    await expect(owner.page.getByText('Edited comment')).toHaveCount(0)

    await owner.page.keyboard.press('Escape')

    // --- FLOW 5: member opens notification panel -> marks read
    await member.page.reload()
    const bell = member.page.getByRole('button', { name: /Notifications/ })
    await expect(bell).toBeVisible()
    await bell.click()
    await expect(member.page.getByText('Notifications', { exact: true })).toBeVisible()
    await expect(member.page.getByText(/assigned/i).first()).toBeVisible()
    await member.page.getByText(/assigned/i).first().click()

    // --- FLOW 6: cross-session realtime — member has the project board open,
    // owner creates a second task, member's screen updates without a refresh.
    await member.page.goto(projectUrl)
    await member.page.waitForLoadState('networkidle')
    await expect(member.page.getByText('To Do (1)')).toBeVisible()

    await owner.page.getByRole('button', { name: '+ Add task' }).click()
    await owner.page.getByLabel('Title', { exact: true }).fill('Realtime Task')
    await owner.page.getByRole('button', { name: 'Create task' }).click()

    await expect(member.page.getByText('Realtime Task')).toBeVisible({ timeout: 10_000 })
    await expect(member.page.getByText('To Do (2)')).toBeVisible()

    await owner.context.close()
    await member.context.close()
  })

  test('FLOW 7 — a non-member cannot access a project by direct URL', async ({ browser }) => {
    const owner = await registerAndLogin(browser, 'flow7owner')
    const outsider = await registerAndLogin(browser, 'flow7outsider')

    await owner.page.goto('/app/projects')
    await owner.page.waitForLoadState('networkidle')
    await owner.page.getByRole('button', { name: '+ New project' }).click()
    await owner.page.getByLabel('Project name').fill('Private Project')
    await owner.page.getByRole('button', { name: 'Create project' }).click()
    await expect(owner.page.getByRole('heading', { name: 'Private Project' })).toBeVisible()
    const privateProjectUrl = owner.page.url()

    await outsider.page.goto(privateProjectUrl)
    await expect(outsider.page.getByRole('heading', { name: 'Private Project' })).toHaveCount(0)
    await expect(outsider.page.getByRole('alert')).toBeVisible({ timeout: 10_000 })

    await owner.context.close()
    await outsider.context.close()
  })
})
