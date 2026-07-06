import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const appDir = join(process.cwd(), 'app')

describe('locale route tree ownership', () => {
  it('keeps renderable routes under the locale segment so next-intl owns HTML language', () => {
    expect(existsSync(join(appDir, 'layout.tsx'))).toBe(false)
    expect(existsSync(join(appDir, '[locale]', 'layout.tsx'))).toBe(true)
    expect(existsSync(join(appDir, '[locale]', 'dashboard', 'page.tsx'))).toBe(
      true
    )
    expect(existsSync(join(appDir, 'dashboard', 'page.tsx'))).toBe(false)
    expect(existsSync(join(appDir, 'page.tsx'))).toBe(false)
  })
})
