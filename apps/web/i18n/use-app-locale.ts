import { useLocale } from 'next-intl'

import { type AppLocale, isAppLocale, routing } from '@/i18n/routing'

/**
 * Return the active locale narrowed to `AppLocale`.
 *
 * `useLocale()` is only valid inside `NextIntlClientProvider`, where the value
 * is already one of the configured locales; the fallback keeps the return type
 * as `AppLocale` for callers (e.g. `buildLocalizedPath`) without a cast.
 *
 * @returns {AppLocale} The active application locale.
 */
export function useAppLocale(): AppLocale {
  const locale = useLocale()
  return isAppLocale(locale) ? locale : routing.defaultLocale
}
