import { describe, expect, it } from 'vitest'

import { routing } from '@/i18n/routing'
import {
  buildLocalizedPath,
  formatShortDate,
  stripLocaleFromPathname,
} from '@/lib/format'

describe('i18n routing', () => {
  it('keeps English as the default unprefixed locale', () => {
    expect(routing.locales).toEqual(['en', 'es'])
    expect(routing.defaultLocale).toBe('en')
    expect(routing.localePrefix).toBe('as-needed')
    expect(buildLocalizedPath('/dashboard', 'en')).toBe('/dashboard')
  })

  it('prefixes Spanish paths and preserves query strings', () => {
    expect(buildLocalizedPath('/dashboard?x=1', 'es')).toBe('/es/dashboard?x=1')
    expect(buildLocalizedPath('/es/dashboard?x=1', 'en')).toBe('/dashboard?x=1')
  })

  it('strips supported locale prefixes for auth decisions', () => {
    expect(stripLocaleFromPathname('/es/dashboard')).toEqual({
      locale: 'es',
      pathname: '/dashboard',
    })
    expect(stripLocaleFromPathname('/dashboard')).toEqual({
      locale: 'en',
      pathname: '/dashboard',
    })
  })
})

describe('locale-aware date formatting', () => {
  it('formats short dates in English', () => {
    expect(formatShortDate('2026-06-15T12:00:00Z', 'en')).toBe('Jun 15, 2026')
  })

  it('formats short dates in Spanish', () => {
    expect(formatShortDate('2026-06-15T12:00:00Z', 'es')).toMatch(
      /15 jun 2026/i
    )
  })
})
