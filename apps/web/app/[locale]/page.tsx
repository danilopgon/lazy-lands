import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { AnnouncementBar } from '@/components/layout/announcement-bar'
import { CookieBanner } from '@/components/layout/cookie-banner'
import { LandingPage } from '@/components/landing/landing-page'
import { JsonLd } from '@/components/seo/json-ld'
import { isAppLocale, routing } from '@/i18n/routing'
import {
  buildSocialMetadata,
  buildStructuredData,
  localeAlternates,
} from '@/lib/seo'
import { getSiteUrl } from '@/lib/site'

type HomeProps = {
  params: Promise<{ locale: string }>
}

/**
 * Build locale-aware, indexable landing metadata (not noindex), including
 * canonical + hreflang alternates for the bilingual public home.
 *
 * @param {HomeProps} root0 - Metadata route props.
 * @param {Promise<{locale: string}>} root0.params - App Router locale params.
 * @returns {Promise<Metadata>} Translated title, description, and locale alternates.
 */
export async function generateMetadata({
  params,
}: HomeProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Landing' })
  const tRoot = await getTranslations({ locale, namespace: 'Root' })
  const appLocale = isAppLocale(locale) ? locale : routing.defaultLocale

  return {
    title: t('metadataTitle'),
    description: t('metadataDescription'),
    alternates: localeAlternates('/', appLocale),
    // The share card carries the landing's own title, not the layout's bare
    // brand name: Next replaces `openGraph` per segment instead of merging it,
    // so overriding `title` alone would leave the parent's copy on the card.
    ...buildSocialMetadata({
      locale: appLocale,
      siteName: tRoot('title'),
      tagline: tRoot('description'),
      title: t('metadataTitle'),
      description: tRoot('socialDescription'),
      path: '/',
    }),
  }
}

/**
 * Landing page — composes the marketing overlays and the main landing section,
 * plus the site's JSON-LD structured data (server-rendered, so it is present in
 * the crawlable HTML).
 *
 * @param {HomeProps} root0 - Page props.
 * @param {Promise<{locale: string}>} root0.params - App Router locale params.
 * @returns {Promise<React.ReactElement>} The home page element.
 */
export default async function Home({ params }: HomeProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Landing' })
  const appLocale = isAppLocale(locale) ? locale : routing.defaultLocale

  const structuredData = buildStructuredData({
    name: 'Lazy Lands',
    description: t('metadataDescription'),
    siteUrl: getSiteUrl(),
    locale: appLocale,
  })

  return (
    <>
      <JsonLd data={structuredData} />
      <AnnouncementBar />
      <LandingPage />
      <CookieBanner />
    </>
  )
}
