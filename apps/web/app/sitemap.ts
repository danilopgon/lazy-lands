import type { MetadataRoute } from 'next'

import { getSiteUrl } from '@/lib/site'

// Public, indexable content paths in their default (unprefixed, English) form.
// The Spanish alternate is the same path under `/es` (`localePrefix` 'as-needed').
// Only the landing is real indexable content: the legal pages set
// `robots: { index: false }` (see their generateMetadata) and the auth screens
// are utility, so neither belongs in the sitemap.
const PUBLIC_PATHS = ['']

/**
 * Sitemap of public, indexable pages with per-locale (`en`/`es`) alternates so
 * search engines discover both language versions of each page.
 *
 * @returns {MetadataRoute.Sitemap} Public sitemap entries with locale alternates.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl()
  const lastModified = new Date()

  return PUBLIC_PATHS.map((path) => {
    const enUrl = `${siteUrl}${path === '' ? '/' : path}`
    const esUrl = `${siteUrl}/es${path}`
    return {
      url: enUrl,
      lastModified,
      alternates: {
        languages: { en: enUrl, es: esUrl },
      },
    }
  })
}
