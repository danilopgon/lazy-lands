/**
 * Centralized SEO/GEO helpers: per-page locale alternates (canonical +
 * hreflang) and the site's JSON-LD structured data. Keeping this in one place
 * avoids duplicated, drifting metadata across routes.
 *
 * Everything here derives from verifiable product facts only — no ratings,
 * prices, or claims that aren't backed by the app itself.
 */
import type { Metadata } from 'next'

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

type SocialMetadataInput = {
  locale: AppLocale
  siteName: string
  tagline: string
  title: string
  description: string
  path?: string
}

type SocialMetadata = Required<Pick<Metadata, 'openGraph' | 'twitter'>>

const OG_IMAGE = { width: 1200, height: 630, type: 'image/png' } as const

/**
 * Build the Open Graph + Twitter blocks for a page.
 *
 * Both cards are derived from the page's own title and description. Next does
 * not deep-merge `openGraph` across segments, so a page that overrides `title`
 * without also rebuilding `openGraph` would silently keep the parent layout's
 * copy on every share card — this helper is the single place that keeps the two
 * in sync.
 *
 * `openGraph.url` is set explicitly because Next does not derive `og:url` from
 * `alternates.canonical`. It is omitted unless a page passes its own `path`:
 * scrapers key their share cache on `og:url`, so an inherited site-wide value
 * would make every route claim to be — and share a cache entry with — the page
 * that value points at.
 *
 * The image is addressed by explicit locale prefix, including for the default
 * locale whose pages are unprefixed. The bare `/opengraph-image` would be
 * resolved by `localeDetection`, so a client sending `Accept-Language: es`
 * asking for the English card would be redirected to the Spanish one; the
 * prefixed path names the language instead of negotiating it. `proxy.ts`
 * excludes these paths from i18n routing so the prefix survives.
 *
 * @param {SocialMetadataInput} root0 - Page locale, brand name, tagline, title, description, and locale-free path.
 * @param {AppLocale} root0.locale - The locale of the page being rendered.
 * @param {string} root0.siteName - The brand name used as `og:site_name`.
 * @param {string} root0.tagline - The tagline the social image renders, used as its alt text.
 * @param {string} root0.title - The page title shared as `og:title`.
 * @param {string} root0.description - The share copy used as `og:description`.
 * @param {string} [root0.path] - The page's own locale-free pathname. Omit on shared fallbacks so no `og:url` is emitted.
 * @returns {SocialMetadata} The `openGraph` and `twitter` metadata blocks.
 */
export function buildSocialMetadata({
  locale,
  siteName,
  tagline,
  title,
  description,
  path,
}: SocialMetadataInput): SocialMetadata {
  const images = [
    {
      ...OG_IMAGE,
      url: `/${locale}/opengraph-image`,
      // Describes what the image renders — the wordmark over the tagline — not
      // the longer share copy that sits beside it in the card.
      alt: `${siteName} — ${tagline}`,
    },
  ]

  return {
    openGraph: {
      type: 'website',
      siteName,
      title,
      description,
      ...(path === undefined ? {} : { url: buildLocalizedPath(path, locale) }),
      locale: locale === 'es' ? 'es_ES' : 'en_US',
      alternateLocale: locale === 'es' ? 'en_US' : 'es_ES',
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images,
    },
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
