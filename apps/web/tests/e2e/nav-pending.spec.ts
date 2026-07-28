import { expect, test, type Page } from '@playwright/test'

/**
 * Hold the next client-side navigation to a path long enough for the pending
 * affordance's grace period to elapse.
 *
 * Prefetch requests are aborted rather than delayed. Next warms every link in
 * the viewport, and a warm route resolves inside a single frame — the exact
 * case the 150ms grace period exists to stay quiet for. Aborting the prefetch
 * forces the click to fetch for real, which is the slow navigation under test.
 *
 * @param {Page} page - The page under test.
 * @param {string} pattern - Glob matching the destination route.
 * @returns {Promise<void>} Resolves once the handler is installed.
 */
async function holdNavigationTo(page: Page, pattern: string) {
  await page.route(pattern, async (route) => {
    if (route.request().headers()['next-router-prefetch']) {
      await route.abort()
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 1500))
    await route.continue()
  })
}

// One representative per declaration class, not every <Link> in the codebase:
// the affordance is structural (a single NavLink wrapper), so per-site coverage
// would assert the same code path 73 times.
const CLASSES = [
  {
    name: 'breadcrumb',
    from: '/demo/npcs',
    hold: '**/demo?*',
    link: (page: Page) =>
      page.getByRole('navigation').getByRole('link', { name: 'Demo campaign' }),
  },
  {
    name: 'card/list row',
    from: '/demo',
    hold: '**/demo/npcs*',
    link: (page: Page) => page.getByRole('link', { name: /NPCs/i }).first(),
  },
  {
    name: 'header nav',
    from: '/demo/npcs',
    hold: '**/demo?*',
    link: (page: Page) =>
      page.getByRole('link', { name: /Lazy Lands/i }).first(),
  },
  {
    name: 'button-styled CTA',
    from: '/demo',
    hold: '**/demo/prepare*',
    link: (page: Page) =>
      page.getByRole('link', { name: /Prepare next session/i }).first(),
  },
] as const

for (const declaration of CLASSES) {
  test(`a ${declaration.name} link reports its own navigation as pending`, async ({
    page,
  }) => {
    await page.goto(declaration.from)
    await holdNavigationTo(page, declaration.hold)

    const link = declaration.link(page)
    await expect(link).toBeVisible()
    await link.click()

    await expect(link.locator('[role="status"]')).toBeVisible({ timeout: 3000 })
  })
}

test('links carry no status node while idle', async ({ page }) => {
  await page.goto('/demo')

  // The reserved slot exists from first paint so revealing the quill shifts
  // nothing, but it must contribute no accessible status until a navigation is
  // actually pending — otherwise every link would announce itself at rest.
  await expect(
    page.locator('[data-testid="nav-link-pending"]').first()
  ).toBeAttached()
  await expect(page.locator('a [role="status"]')).toHaveCount(0)
})

test('the pending affordance reserves its footprint', async ({ page }) => {
  await page.goto('/demo')
  const link = page.getByRole('link', { name: /NPCs/i }).first()
  const before = await link.boundingBox()

  await holdNavigationTo(page, '**/demo/npcs*')
  await link.click()
  await expect(link.locator('[role="status"]')).toBeVisible({ timeout: 3000 })

  const after = await link.boundingBox()
  expect(after?.width).toBe(before?.width)
  expect(after?.height).toBe(before?.height)
})
