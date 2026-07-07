import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { AnnouncementBar } from '@/components/layout/announcement-bar'
import { CookieBanner } from '@/components/layout/cookie-banner'
import { LandingPage } from '@/components/landing/landing-page'

/**
 * Build locale-aware, indexable landing metadata (not noindex).
 *
 * @param {object} root0 - Metadata route props.
 * @param {Promise<{locale: string}>} root0.params - App Router locale params.
 * @returns {Promise<Metadata>} Translated title and description for the active locale.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Landing' })

  return {
    title: t('metadataTitle'),
    description: t('metadataDescription'),
  }
}

/**
 * Landing page — composes the marketing overlays and the main landing section.
 *
 * @returns {React.ReactElement} The home page element with announcement, landing, and cookie banner.
 */
export default function Home() {
  return (
    <>
      <AnnouncementBar />
      <LandingPage />
      <CookieBanner />
    </>
  )
}
