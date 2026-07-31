import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { ImageResponse } from 'next/og'
import { getTranslations } from 'next-intl/server'

import { routing } from '@/i18n/routing'

export const alt = 'Lazy Lands — Campaign Companion for Dungeon Masters'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Source Serif 4 SemiBold is the brand wordmark face (DESIGN.md). It is embedded
// here so the social image renders in the real brand typography rather than the
// generic satori fallback. Read at build time (this image is statically
// prerendered), so there is no runtime file dependency.
const FONT_PATH = join(process.cwd(), 'lib/og/source-serif-4-semibold.ttf')

/**
 * Return the supported locale params so both social images are prerendered.
 *
 * @returns {{locale: string}[]} Supported locale params.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

type OpenGraphImageProps = {
  params: Promise<{ locale: string }>
}

/**
 * Default social-sharing (Open Graph / Twitter) image, rendered from the
 * design-system palette in the brand serif. A bespoke, art-directed image pack
 * is deferred post-MVP; this is the credible baseline.
 *
 * Lives inside the locale segment so the tagline matches the language of the
 * page being shared, and so the image resolves under the same
 * `localePrefix: 'as-needed'` scheme as every other route.
 *
 * @param {OpenGraphImageProps} root0 - Image route props.
 * @param {Promise<{locale: string}>} root0.params - App Router locale params.
 * @returns {Promise<ImageResponse>} The rendered 1200×630 social image.
 */
export default async function OpenGraphImage({ params }: OpenGraphImageProps) {
  const { locale } = await params
  const [sourceSerif, t] = await Promise.all([
    readFile(FONT_PATH),
    getTranslations({ locale, namespace: 'Root' }),
  ])

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '90px',
        backgroundColor: '#F2ECE0',
        borderBottom: '28px solid #3A7D44',
        fontFamily: 'Source Serif 4',
      }}
    >
      <div
        style={{
          display: 'flex',
          fontSize: 140,
          fontWeight: 600,
          letterSpacing: '-4px',
        }}
      >
        <span style={{ color: '#1A1C19' }}>Lazy</span>
        <span style={{ color: '#3A7D44', marginLeft: 34 }}>Lands</span>
      </div>
      <div
        style={{
          display: 'flex',
          marginTop: 30,
          fontSize: 48,
          color: '#585C51',
        }}
      >
        {t('description')}
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: 'Source Serif 4',
          data: sourceSerif,
          weight: 600,
          style: 'normal',
        },
      ],
    }
  )
}
