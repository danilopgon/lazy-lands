import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'es'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
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
