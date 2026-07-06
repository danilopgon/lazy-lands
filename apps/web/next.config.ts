import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import path from 'node:path'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {
    root: path.join(process.cwd(), '../..'),
  },
}

export default withNextIntl(nextConfig)
