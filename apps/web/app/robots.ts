import type { MetadataRoute } from 'next'

import { getSiteUrl, isProductionDeploy } from '@/lib/site'

// Private, authenticated, or utility paths that must never be indexed. Listed
// for both the default (unprefixed, English) and the `/es` Spanish routes,
// because `localePrefix` is 'as-needed'.
const PRIVATE_PATHS = ['/dashboard', '/campaigns', '/auth', '/forgot-password']

/**
 * Expand the private path list to cover both the default (English, unprefixed)
 * and the `/es` Spanish routes.
 *
 * @returns {string[]} Disallow patterns for every locale variant.
 */
function disallowedPaths(): string[] {
  return PRIVATE_PATHS.flatMap((path) => [path, `/es${path}`])
}

/**
 * robots.txt policy. Only the production deployment is indexable; preview and
 * development deploys (which also run with `NODE_ENV=production`) are fully
 * disallowed via the `VERCEL_ENV` gate in {@link isProductionDeploy}.
 *
 * @returns {MetadataRoute.Robots} The robots.txt rules for this deployment.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()

  if (!isProductionDeploy()) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: disallowedPaths(),
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
