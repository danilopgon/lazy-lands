import en from '@/messages/en.json'
import es from '@/messages/es.json'
import { type AppLocale, routing } from '@/i18n/routing'
import { stripLocaleFromPathname } from '@/lib/format'

export const catalogs = { en, es } as const

export type UiMessages = typeof en

/**
 * Return the UI message catalog for a supported locale.
 *
 * @param {AppLocale} locale - Active application locale.
 * @returns {UiMessages} The matching message catalog.
 */
export function getUiMessages(locale: AppLocale = routing.defaultLocale) {
  return catalogs[locale]
}

/**
 * Resolve a locale from an application pathname.
 *
 * @param {string} pathname - Pathname that may include a leading locale segment.
 * @returns {AppLocale} The detected locale, defaulting to English.
 */
export function getLocaleFromPathname(pathname: string): AppLocale {
  return stripLocaleFromPathname(pathname).locale
}

/**
 * Resolve the active client locale from the document or current URL.
 *
 * @returns {AppLocale} The active client locale.
 */
export function getClientLocale(): AppLocale {
  if (typeof document !== 'undefined') {
    const htmlLang = document.documentElement.lang
    if (htmlLang === 'en' || htmlLang === 'es') return htmlLang
  }

  if (typeof window !== 'undefined') {
    return getLocaleFromPathname(window.location.pathname)
  }

  return routing.defaultLocale
}

/**
 * Return UI messages for the active browser locale context.
 *
 * @returns {UiMessages} UI copy for the current client locale.
 */
export function getClientUiMessages() {
  return getUiMessages(getClientLocale())
}
