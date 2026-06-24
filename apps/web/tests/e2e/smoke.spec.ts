import { expect, test } from '@playwright/test'

// Updated smoke test — new copy assertions (LAND-012a, LAND-010).
// This replaces: 'Remember what happened. Prepare what comes next.'

test('landing page loads with new copy and correct title', async ({ page }) => {
  await page.goto('/')

  // LAND-012a: title contains "Lazy Lands"
  await expect(page).toHaveTitle(/Lazy Lands/)

  // LAND-003a: hero text visible
  await expect(page.getByText('Your campaign,')).toBeVisible()

  // LAND-003c: primary CTA visible
  await expect(
    page.getByRole('link', { name: /start your chronicle/i })
  ).toBeVisible()

  // LAND-010b/c: footer legal links visible
  await expect(page.getByRole('link', { name: /privacy/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /cookies/i })).toBeVisible()
})
