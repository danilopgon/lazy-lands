import { describe, expect, it, vi } from 'vitest'

import en from '@/messages/en.json'
import es from '@/messages/es.json'
import { buildSocialMetadata } from '@/lib/seo'

// `getTranslations` is a server-only API and throws under vitest's client
// environment, so back it with the real catalogs to exercise generateMetadata.
vi.mock('next-intl/server', () => ({
  getTranslations: async ({
    locale,
    namespace,
  }: {
    locale: string
    namespace: string
  }) => {
    const catalog = (locale === 'es' ? es : en) as Record<string, unknown>
    const scope = catalog[namespace] as Record<string, string>
    return (key: string) => scope[key]
  },
}))

type OpenGraph = {
  url?: string
  title?: string
  description?: string
  siteName?: string
  type?: string
  locale?: string
  alternateLocale?: string
  images?: { url: string; width: number; height: number; alt: string }[]
}

type Twitter = {
  card?: string
  title?: string
  description?: string
  images?: { url: string }[]
}

describe('buildSocialMetadata', () => {
  const base = {
    siteName: 'Lazy Lands',
    tagline: 'Campaign Companion for Dungeon Masters',
    title: 'Lazy Lands · Campaign Companion',
    description: 'A description worth sharing.',
    path: '/',
  }

  it('sets og:url explicitly, since Next does not derive it from the canonical', () => {
    const english = buildSocialMetadata({ ...base, locale: 'en' })
      .openGraph as OpenGraph
    const spanish = buildSocialMetadata({ ...base, locale: 'es' })
      .openGraph as OpenGraph

    expect(english.url).toBe('/')
    expect(spanish.url).toBe('/es')
  })

  it('prefixes og:url per locale for nested paths', () => {
    const og = buildSocialMetadata({
      ...base,
      path: '/login',
      locale: 'es',
    }).openGraph as OpenGraph

    expect(og.url).toBe('/es/login')
  })

  it('points og:image at the unprefixed English image route', () => {
    const og = buildSocialMetadata({ ...base, locale: 'en' })
      .openGraph as OpenGraph

    // Not `/en/opengraph-image`: `localePrefix: 'as-needed'` redirects the
    // default-locale prefix away, and a redirect hop loses some scrapers.
    expect(og.images?.[0]?.url).toBe('/opengraph-image')
    expect(og.images?.[0]).toMatchObject({ width: 1200, height: 630 })
  })

  it('points og:image at the Spanish image route on Spanish pages', () => {
    const og = buildSocialMetadata({ ...base, locale: 'es' })
      .openGraph as OpenGraph

    expect(og.images?.[0]?.url).toBe('/es/opengraph-image')
  })

  it('gives the Twitter card the same image, so twitter:image is never empty', () => {
    const { twitter } = buildSocialMetadata({ ...base, locale: 'en' })
    const card = twitter as Twitter

    expect(card.card).toBe('summary_large_image')
    expect(card.images?.[0]?.url).toBe('/opengraph-image')
    expect(card.title).toBe(base.title)
    expect(card.description).toBe(base.description)
  })

  it('declares the locale pair so crawlers can find the other language', () => {
    const og = buildSocialMetadata({ ...base, locale: 'es' })
      .openGraph as OpenGraph

    expect(og.type).toBe('website')
    expect(og.siteName).toBe('Lazy Lands')
    expect(og.locale).toBe('es_ES')
    expect(og.alternateLocale).toBe('en_US')
  })

  it('describes what the image renders via og:image:alt', () => {
    const og = buildSocialMetadata({ ...base, locale: 'en' })
      .openGraph as OpenGraph

    // The wordmark over the tagline — not the longer share copy beside it.
    expect(og.images?.[0]?.alt).toBe(`${base.siteName} — ${base.tagline}`)
    expect(og.images?.[0]?.alt).not.toContain(base.description)
  })
})

describe('landing share card', () => {
  /**
   * Load the landing metadata for a locale.
   *
   * @param {string} locale - The locale to render metadata for.
   * @returns {Promise<{openGraph?: OpenGraph, twitter?: Twitter}>} The resolved metadata.
   */
  async function landingMetadata(locale: string) {
    const { generateMetadata } = await import('@/app/[locale]/page')
    return (await generateMetadata({
      params: Promise.resolve({ locale }),
    })) as { openGraph?: OpenGraph; twitter?: Twitter }
  }

  it('shares the landing title, not the bare brand name', async () => {
    const { openGraph } = await landingMetadata('en')

    // The bare "Lazy Lands" is 10 chars — too short to describe the product.
    expect(openGraph?.title).toBe(en.Landing.metadataTitle)
    expect(openGraph?.title?.length).toBeGreaterThanOrEqual(50)
  })

  it('shares copy long enough to be worth reading', async () => {
    const { openGraph } = await landingMetadata('en')

    // The 38-char site tagline is what previously leaked onto the card.
    expect(openGraph?.description).not.toBe(en.Root.description)
    expect(openGraph?.description?.length).toBeGreaterThanOrEqual(110)
    expect(openGraph?.description?.length).toBeLessThanOrEqual(160)
  })

  it('localizes the Spanish share card end to end', async () => {
    const { openGraph } = await landingMetadata('es')

    expect(openGraph?.title).toBe(es.Landing.metadataTitle)
    expect(openGraph?.description).toBe(es.Root.socialDescription)
    expect(openGraph?.url).toBe('/es')
    expect(openGraph?.images?.[0]?.url).toBe('/es/opengraph-image')
  })

  it('carries an image on both the Open Graph and Twitter cards', async () => {
    const { openGraph, twitter } = await landingMetadata('en')

    expect(openGraph?.images?.[0]?.url).toBe('/opengraph-image')
    expect(twitter?.images?.[0]?.url).toBe('/opengraph-image')
  })
})
