import { expect, test } from '@playwright/test'

// SM-E2E-01: Unauthenticated visit to a protected route redirects to /login.
//
// Note: this test requires `pnpm dev` to be running on port 3000.
test('SM-E2E-01: unauthenticated visit to /dashboard redirects to /login', async ({
  page,
}) => {
  await page.context().clearCookies()

  await page.goto('/dashboard', { waitUntil: 'networkidle' })

  await expect(page).toHaveURL(/\/login/)
})
