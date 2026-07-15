import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'es'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
  // Locale precedence (next-intl prefix routing): explicit URL prefix >
  // `NEXT_LOCALE` cookie > `accept-language` > `defaultLocale`. Anonymous
  // visitors get their browser culture on the unprefixed `/` paths; the language
  // switcher writes the cookie on every switch, so a detected browser locale can
  // no longer trap a user on the wrong language (the reason detection was
  // previously disabled). An explicit `/en` / `/es` in the URL always wins.
  localeDetection: true,
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
