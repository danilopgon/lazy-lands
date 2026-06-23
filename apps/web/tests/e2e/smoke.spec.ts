import { expect, test } from '@playwright/test'

test('landing page communicates the core promise', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/Lazy Lands/)
  await expect(
    page.getByText('Remember what happened. Prepare what comes next.')
  ).toBeVisible()
})
