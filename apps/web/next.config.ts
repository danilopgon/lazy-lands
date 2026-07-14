import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import path from 'node:path'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

/**
 * Return a CSP-safe HTTP(S) origin from a public service URL.
 *
 * @param {string | undefined} value - Public service URL.
 * @returns {string | undefined} The normalized origin when valid and supported.
 */
function getCspConnectOrigin(value: string | undefined): string | undefined {
  if (!value) {
    return undefined
  }

  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.origin
      : undefined
  } catch {
    return undefined
  }
}

const connectSources = [
  "'self'",
  getCspConnectOrigin(process.env.NEXT_PUBLIC_API_URL),
  getCspConnectOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL),
].filter((source): source is string => source !== undefined)

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${
    process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''
  }`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  `connect-src ${connectSources.join(' ')}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {
    root: path.join(process.cwd(), '../..'),
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), geolocation=(), microphone=()',
          },
        ],
      },
    ]
  },
}

export default withNextIntl(nextConfig)
