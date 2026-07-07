import { type AppLocale, isAppLocale, routing } from '@/i18n/routing'

// Keep the BCP-47 date tags as a small literal map rather than importing them
// from the message catalogs: `format.ts` is pulled into the Edge middleware
// (`proxy.ts`) and many client chunks, and a JSON import is not tree-shaken
// per-property, so reading `Dates.locale` would bundle the entire ~11KB catalog
// (including the whole Landing marketing namespace) into all of them.
const LOCALE_DATE_TAGS: Record<AppLocale, string> = {
  en: 'en-US',
  es: 'es-ES',
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
