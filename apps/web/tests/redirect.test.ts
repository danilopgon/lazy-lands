import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { resolveAppOrigin } from '@/lib/auth/redirect'

describe('resolveAppOrigin', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { location: { origin: 'http://browser.local' } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.NEXT_PUBLIC_APP_URL
  })

  it('returns the configured origin when NEXT_PUBLIC_APP_URL is set', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'
    expect(resolveAppOrigin()).toBe('https://app.example.com')
  })

  it('strips trailing slashes from the configured origin', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com///'
    expect(resolveAppOrigin()).toBe('https://app.example.com')
  })

  it('falls back to the current browser origin when the env var is unset', () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    expect(resolveAppOrigin()).toBe('http://browser.local')
  })

  it('falls back to the browser origin when the env var is blank', () => {
    process.env.NEXT_PUBLIC_APP_URL = '   '
    expect(resolveAppOrigin()).toBe('http://browser.local')
  })
})
