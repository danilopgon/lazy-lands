/**
 * Public site URL + deploy-environment helpers used to build absolute metadata
 * (canonical, Open Graph, sitemap, robots).
 *
 * The production domain is env-driven so it can be set per environment in Vercel
 * without a code change. Precedence:
 *   1. `NEXT_PUBLIC_APP_URL` — the configured app origin (already used for auth
 *      redirects); the single source of truth for the public URL.
 *   2. `VERCEL_PROJECT_PRODUCTION_URL` — Vercel's stable production domain.
 *   3. `http://localhost:3000` — local development fallback.
 *
 * `VERCEL_URL` is deliberately NOT used: it is the per-deployment preview host and
 * would poison canonical/OG URLs. Vercel host vars are host-only, so a scheme is
 * prepended when missing.
 */

const LOCALHOST_URL = 'http://localhost:3000'

/**
 * Ensure a URL string has an http(s) scheme (Vercel host vars are host-only).
 *
 * @param {string} url - Candidate URL, with or without a scheme.
 * @returns {string} The URL guaranteed to start with a scheme.
 */
function withScheme(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

/**
 * Remove any trailing slashes so base URLs concatenate predictably.
 *
 * @param {string} url - URL that may end with one or more slashes.
 * @returns {string} The URL without trailing slashes.
 */
function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

/**
 * Resolve the public base URL for absolute metadata. Never ends with a slash.
 *
 * @returns {string} The resolved site base URL.
 */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL
  if (configured && configured.trim()) {
    return stripTrailingSlash(withScheme(configured.trim()))
  }

  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercelProduction && vercelProduction.trim()) {
    return stripTrailingSlash(withScheme(vercelProduction.trim()))
  }

  return LOCALHOST_URL
}

/**
 * Whether this is the production deployment. Gated on Vercel's `VERCEL_ENV`
 * rather than `NODE_ENV`, because preview deploys also run with
 * `NODE_ENV=production` and must NOT be indexed.
 *
 * @returns {boolean} True only on the production deployment.
 */
export function isProductionDeploy(): boolean {
  return process.env.VERCEL_ENV === 'production'
}
