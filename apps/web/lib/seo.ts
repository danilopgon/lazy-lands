/**
 * Centralized SEO/GEO helpers: per-page locale alternates (canonical +
 * hreflang) and the site's JSON-LD structured data. Keeping this in one place
 * avoids duplicated, drifting metadata across routes.
 *
 * Everything here derives from verifiable product facts only — no ratings,
 * prices, or claims that aren't backed by the app itself.
 */
import { buildLocalizedPath } from '@/lib/format'
import type { AppLocale } from '@/i18n/routing'

type LocaleAlternates = {
  canonical: string
  languages: Record<string, string>
}

/**
 * Build `alternates` (canonical + hreflang languages) for a locale-free path.
 *
 * Paths are relative; Next resolves them against `metadataBase`. `x-default`
 * points at the unprefixed English route, matching the `as-needed` prefix
 * strategy where `/` is English and `/es/...` is Spanish.
 *
 * @param {string} path - The locale-free pathname (e.g. `/` or `/login`).
 * @param {AppLocale} locale - The locale of the page being rendered.
 * @returns {LocaleAlternates} The canonical URL and per-language alternates.
 */
export function localeAlternates(
  path: string,
  locale: AppLocale
): LocaleAlternates {
  const en = buildLocalizedPath(path, 'en')
  const es = buildLocalizedPath(path, 'es')

  return {
    canonical: locale === 'es' ? es : en,
    languages: { en, es, 'x-default': en },
  }
}

type StructuredDataInput = {
  name: string
  description: string
  siteUrl: string
  locale: AppLocale
}

/**
 * Build the site's JSON-LD `@graph`: WebSite, Organization, and the
 * SoftwareApplication that Lazy Lands is. Only verifiable fields are emitted —
 * no offers, ratings, or feature claims.
 *
 * @param {StructuredDataInput} input - Verified name, description, absolute site URL, and page locale.
 * @returns {Record<string, unknown>} A schema.org graph ready to serialize as JSON-LD.
 */
export function buildStructuredData({
  name,
  description,
  siteUrl,
  locale,
}: StructuredDataInput): Record<string, unknown> {
  const websiteId = `${siteUrl}/#website`
  const organizationId = `${siteUrl}/#organization`
  const languages = ['en', 'es']

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': websiteId,
        url: `${siteUrl}/`,
        name,
        description,
        inLanguage: languages,
        publisher: { '@id': organizationId },
      },
      {
        '@type': 'Organization',
        '@id': organizationId,
        name,
        url: `${siteUrl}/`,
        logo: `${siteUrl}/icon.svg`,
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${siteUrl}/#software`,
        name,
        url: `${siteUrl}/`,
        description,
        // Campaign-management tooling for tabletop RPGs; GameApplication is the
        // schema.org category closest to the tabletop-RPG domain it serves.
        applicationCategory: 'GameApplication',
        operatingSystem: 'Web browser',
        inLanguage: locale === 'es' ? 'es' : 'en',
        publisher: { '@id': organizationId },
      },
    ],
  }
}
