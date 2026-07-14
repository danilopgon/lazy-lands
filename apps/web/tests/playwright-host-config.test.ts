import { describe, expect, it } from 'vitest'

import config from '../playwright.config'

describe('the isolated Playwright host', () => {
  it('never attaches the E2E suite to an already-running development server', () => {
    expect(config.webServer).toMatchObject({
      port: 3001,
      reuseExistingServer: false,
    })
  })
})
