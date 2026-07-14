import { expect, test } from '@playwright/test'

const desktopViewports = [
  { width: 1440, height: 900 },
  { width: 1536, height: 960 },
  { width: 1920, height: 1080 },
]

for (const viewport of desktopViewports) {
  test(`protected workspace keeps a bounded, non-overflowing entry path at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    await page.context().clearCookies()
    await page.goto('/dashboard', { waitUntil: 'networkidle' })

    await expect(page).toHaveURL(/\/login/)
    expect(
      await page
        .locator('body')
        .evaluate((body) => body.scrollWidth <= window.innerWidth)
    ).toBe(true)
  })
}

test('Spanish login remains keyboard-operable and non-overflowing at the workspace threshold', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/es/login')

  await page.getByRole('textbox', { name: 'Correo electrónico' }).focus()
  await page.keyboard.press('Tab')

  await expect(page.getByRole('textbox', { name: 'Contraseña' })).toBeFocused()

  expect(
    await page
      .locator('body')
      .evaluate((body) => body.scrollWidth <= window.innerWidth)
  ).toBe(true)
})

test('reduced motion preserves the protected login entry path at 1440px', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/login')

  await expect(page.getByRole('textbox').first()).toBeVisible()
  expect(
    await page
      .locator('body')
      .evaluate((body) => body.scrollWidth <= window.innerWidth)
  ).toBe(true)
})
