import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'es'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
  // URLs are authoritative: `/` is always English, `/es/...` is Spanish. Without
  // this, next-intl redirects `/` to the Accept-Language match, which traps a
  // Spanish browser on `/es` — the language switcher (plain links, no locale
  // cookie) could never reach English. Revisit if auto-detection is wanted once
  // the public pages are fully bilingual.
  localeDetection: false,
})

export type AppLocale = (typeof routing.locales)[number]

/**
 * Return whether an arbitrary string is one of the supported app locales.
 *
 * @param {string} value - Candidate locale string.
 * @returns {boolean} Whether the value is an application locale.
 */
export function isAppLocale(value: string): value is AppLocale {
  return routing.locales.includes(value as AppLocale)
}
