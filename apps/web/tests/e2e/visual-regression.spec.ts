import { expect, test } from '@playwright/test'

import { installVisualRegressionFixtures } from './visual-regression-fixtures'

const viewports = [
  { width: 1440, height: 900 },
  { width: 900, height: 900 },
]

for (const locale of ['en', 'es']) {
  for (const view of [
    'campaign-detail',
    'generated-session',
    'memory-review',
  ]) {
    for (const viewport of viewports) {
      test(`${locale} ${view} remains visually stable at ${viewport.width}×${viewport.height}`, async ({
        page,
      }) => {
        await installVisualRegressionFixtures(page)
        await page.setViewportSize(viewport)
        const memoryReviewQuery =
          view === 'memory-review' ? '?session=visual-session' : ''
        await page.goto(
          `/${locale === 'en' ? '' : `${locale}/`}visual-regression/visual-campaign/${view}${memoryReviewQuery}`
        )

        await page.evaluate(async () => document.fonts.ready)
        await expect(page.locator('html')).toHaveAttribute('data-motion', 'off')
        await expect(page.getByRole('main')).toBeVisible()
        if (view === 'memory-review') {
          await expect(
            page.getByText(
              'The Black Spider has learned where the party hides the map.'
            )
          ).toBeVisible()
        }
        await expect(page).toHaveScreenshot(
          `${locale}-${view}-${viewport.width}x${viewport.height}.png`,
          { animations: 'disabled', caret: 'hide' }
        )
      })
    }
  }
}
