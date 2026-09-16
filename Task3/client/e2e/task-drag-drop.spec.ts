import { test, expect, type Locator, type Page } from '@playwright/test'

// Verifies the drag-and-drop-move-task-between-boards fix end to end, in a
// real browser, against the real backend — matching the bug report's own
// TEST 1-8 scenarios.
const suffix = Date.now()

// Playwright's high-level locator.dragTo() drives drag-and-drop via plain
// simulated mouse movement, which most DnD *libraries* listen for — but
// this app uses the native HTML5 Drag and Drop API directly (draggable
// attribute + DataTransfer), and Chromium only recognizes that as a real
// drag gesture when genuine dragstart/dragover/drop DOM events fire, which
// synthetic mouse movement alone does not reliably trigger. This is
// Playwright's own documented workaround for testing native HTML5 DnD:
// dispatch the actual drag events by hand, with a mock DataTransfer (a
// *real* `new DataTransfer()` is subject to the browser's own read/write
// "mode" restrictions, which normally only transition as part of a genuine
// OS-initiated drag sequence — a manually dispatched DragEvent doesn't
// trigger those transitions, so a real DataTransfer's setData()/getData()
// can silently no-op here; a plain mock object with the same two methods
// this app actually calls sidesteps that entirely).
async function html5Drag(page: Page, source: Locator, target: Locator) {
  const sourceHandle = await source.elementHandle()
  const targetHandle = await target.elementHandle()
  if (!sourceHandle || !targetHandle) throw new Error('html5Drag: source or target element not found')

  await page.evaluate(
    ([sourceEl, targetEl]) => {
      const store = new Map<string, string>()
      const dataTransfer = {
        setData: (type: string, value: string) => store.set(type, value),
        getData: (type: string) => store.get(type) ?? '',
        clearData: () => store.clear(),
        dropEffect: 'move',
        effectAllowed: 'all',
        files: [] as unknown as FileList,
        items: [] as unknown as DataTransferItemList,
        types: [] as string[],
      }

      const rect = (targetEl as HTMLElement).getBoundingClientRect()
      const clientX = rect.left + rect.width / 2
      const clientY = rect.top + rect.height / 2

      function fire(type: string, el: Element) {
        const event = new DragEvent(type, { bubbles: true, cancelable: true, clientX, clientY })
        Object.defineProperty(event, 'dataTransfer', { value: dataTransfer })
        el.dispatchEvent(event)
      }

      fire('dragstart', sourceEl as HTMLElement)
      fire('dragenter', targetEl as HTMLElement)
      fire('dragover', targetEl as HTMLElement)
      fire('drop', targetEl as HTMLElement)
      fire('dragend', sourceEl as HTMLElement)
    },
    [sourceHandle, targetHandle] as const,
  )
}

async function registerAndLogin(page: Page, label: string) {
  await page.goto('/register')
  await page.waitForLoadState('networkidle')
  await page.getByLabel('Full name').fill(`${label} Test`)
  await page.getByLabel('Username').fill(`${label}_${suffix}`)
  await page.getByLabel('Email').fill(`${label}_${suffix}@e2e-test.com`)
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/app\/dashboard/)
}

test('drag a task between board columns: persists, refreshes correctly, and reaches a second session live', async ({
  browser,
}) => {
  test.setTimeout(60_000)
  const ownerContext = await browser.newContext()
  const owner = await ownerContext.newPage()
  await registerAndLogin(owner, 'dragowner')

  const memberContext = await browser.newContext()
  const memberPage = await memberContext.newPage()
  await registerAndLogin(memberPage, 'dragmember')

  await owner.goto('/app/projects')
  await owner.waitForLoadState('networkidle')
  await owner.getByRole('button', { name: '+ New project' }).click()
  await owner.getByLabel('Project name').fill('Drag Drop Project')
  await owner.getByRole('button', { name: 'Create project' }).click()
  await expect(owner.getByRole('heading', { name: 'Drag Drop Project' })).toBeVisible()
  const projectUrl = owner.url()

  // Add "dragmember" as a real project member so their session can
  // legitimately open this project at all (otherwise it's a 403, not a
  // realtime test).
  await owner.getByRole('button', { name: /Members/ }).click()
  await owner.getByRole('button', { name: '+ Add member' }).click()
  await owner.getByLabel('Search by name or username').fill(`dragmember_${suffix}`)
  await owner.getByText(`@dragmember_${suffix}`).click()
  await owner.getByRole('button', { name: 'Add to project' }).click()
  await expect(owner.getByText(`@dragmember_${suffix}`)).toBeVisible()
  await owner.getByRole('button', { name: /^Board$/ }).click()

  // Two boards: "To Do" and "In Progress".
  await owner.getByRole('button', { name: '+ New board' }).click()
  await owner.getByLabel('Board name').fill('To Do')
  await owner.getByRole('button', { name: 'Save' }).click()
  await expect(owner.getByText('To Do (0)')).toBeVisible()

  await owner.getByRole('button', { name: '+ New board' }).click()
  await owner.getByLabel('Board name').fill('In Progress')
  await owner.getByRole('button', { name: 'Save' }).click()
  await expect(owner.getByText('In Progress (0)')).toBeVisible()

  // The member's session opens the same project for the realtime check
  // (TEST 8), joined before the move happens.
  await memberPage.goto(projectUrl)
  await memberPage.waitForLoadState('networkidle')
  await expect(memberPage.getByText('In Progress (0)')).toBeVisible()

  // Task in "To Do".
  const todoColumn = owner.locator('section', { has: owner.getByText('To Do (', { exact: false }) })
  await todoColumn.getByRole('button', { name: '+ Add task' }).click()
  await owner.getByLabel('Title', { exact: true }).fill('Design landing page')
  await owner.getByRole('button', { name: 'Create task' }).click()
  await expect(owner.getByText('Design landing page')).toBeVisible()

  // --- TEST 1: drag To Do -> In Progress ---
  const inProgressColumn = owner.locator('section', { has: owner.getByText('In Progress (', { exact: false }) })
  const taskCard = owner.locator('[data-testid^="task-card-"]')
  const inProgressBody = inProgressColumn.locator('[data-testid^="column-body-"]')
  await html5Drag(owner, taskCard, inProgressBody)

  await expect(owner.getByText('To Do (0)')).toBeVisible()
  await expect(owner.getByText('In Progress (1)')).toBeVisible()
  // The card is now inside the In Progress column specifically (not just
  // present somewhere on the page).
  await expect(inProgressColumn.getByText('Design landing page')).toBeVisible()

  // --- TEST 6/7 (implicit): the PATCH succeeded — confirmed by TEST 1's
  // own assertions above actually reflecting the move; a failed API call
  // would have rolled the optimistic UI update back (see
  // useKanban.ts's moveTaskToBoard catch block), so this passing is
  // itself proof the real backend endpoint was called and returned success.

  // --- TEST 8: the second session sees the move live, without refreshing ---
  await expect(memberPage.getByText('In Progress (1)')).toBeVisible({ timeout: 10_000 })
  const memberInProgress = memberPage.locator('section', { has: memberPage.getByText('In Progress (', { exact: false }) })
  await expect(memberInProgress.getByText('Design landing page')).toBeVisible()

  // --- TEST 2: refresh, verify it stuck ---
  await owner.reload()
  await owner.waitForLoadState('networkidle')
  await expect(owner.getByText('To Do (0)')).toBeVisible()
  await expect(owner.getByText('In Progress (1)')).toBeVisible()
  const inProgressAfterReload = owner.locator('section', { has: owner.getByText('In Progress (', { exact: false }) })
  await expect(inProgressAfterReload.getByText('Design landing page')).toBeVisible()

  // A third, empty board: "Done" — also tests dropping into an EMPTY
  // column, which was the second half of the original bug.
  await owner.getByRole('button', { name: '+ New board' }).click()
  await owner.getByLabel('Board name').fill('Done')
  await owner.getByRole('button', { name: 'Save' }).click()
  await expect(owner.getByText('Done (0)')).toBeVisible()

  // --- TEST 3: move In Progress -> Done (an empty column) ---
  const doneColumn = owner.locator('section', { has: owner.getByText('Done (', { exact: false }) })
  const doneBody = doneColumn.locator('[data-testid^="column-body-"]')
  await html5Drag(owner, owner.locator('[data-testid^="task-card-"]'), doneBody)

  await expect(owner.getByText('In Progress (0)')).toBeVisible()
  await expect(owner.getByText('Done (1)')).toBeVisible()
  await expect(doneColumn.getByText('Design landing page')).toBeVisible()

  // --- TEST 4: refresh again ---
  await owner.reload()
  await owner.waitForLoadState('networkidle')
  await expect(owner.getByText('In Progress (0)')).toBeVisible()
  await expect(owner.getByText('Done (1)')).toBeVisible()
  const doneAfterReload = owner.locator('section', { has: owner.getByText('Done (', { exact: false }) })
  await expect(doneAfterReload.getByText('Design landing page')).toBeVisible()

  // --- TEST 5: open task details, confirm it reflects the destination board ---
  await owner.getByText('Design landing page').click()
  await expect(owner.getByRole('dialog', { name: 'Task in Done' })).toBeVisible()
  await owner.keyboard.press('Escape')

  await ownerContext.close()
  await memberContext.close()
})
