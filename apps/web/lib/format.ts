import { type AppLocale, isAppLocale, routing } from '@/i18n/routing'
import en from '@/messages/en.json'
import es from '@/messages/es.json'

// Single source of truth for the BCP-47 date tag per locale lives in the
// message catalogs (`Dates.locale`), so the tag never drifts from the rest of
// the i18n config when a locale is added or corrected.
const LOCALE_DATE_TAGS: Record<AppLocale, string> = {
  en: en.Dates.locale,
  es: es.Dates.locale,
}

/**
 * Format an ISO date string as a short, human-readable date.
 *
 * @param {string} iso - An ISO-8601 date-time string.
 * @param {AppLocale} locale - The active application locale.
 * @returns {string} The formatted short date.
 */
export function formatShortDate(
  iso: string,
  locale: AppLocale = routing.defaultLocale
): string {
  return new Date(iso).toLocaleDateString(LOCALE_DATE_TAGS[locale], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Strip a supported leading locale segment from a pathname for auth decisions.
 *
 * @param {string} pathname - The URL pathname to normalize.
 * @returns {{locale: AppLocale, pathname: string}} The detected locale and unprefixed pathname.
 */
export function stripLocaleFromPathname(pathname: string): {
  locale: AppLocale
  pathname: string
} {
  const [, maybeLocale, ...rest] = pathname.split('/')

  if (maybeLocale && isAppLocale(maybeLocale)) {
    return {
      locale: maybeLocale,
      pathname: rest.length ? `/${rest.join('/')}` : '/',
    }
  }

  return { locale: routing.defaultLocale, pathname }
}

/**
 * Build a localized path while preserving the current query string.
 *
 * @param {string} pathWithSearch - The source pathname plus optional search string.
 * @param {AppLocale} locale - The target locale.
 * @returns {string} The localized path using unprefixed English and `/es` for Spanish.
 */
export function buildLocalizedPath(pathWithSearch: string, locale: AppLocale) {
  const [rawPathname = '/', search = ''] = pathWithSearch.split('?')
  const { pathname } = stripLocaleFromPathname(rawPathname || '/')
  const localizedPathname =
    locale === routing.defaultLocale
      ? pathname
      : `/es${pathname === '/' ? '' : pathname}`

  return search ? `${localizedPathname}?${search}` : localizedPathname
}
