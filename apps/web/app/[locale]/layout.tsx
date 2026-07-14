import type { Metadata, Viewport } from 'next'
import {
  Instrument_Sans,
  JetBrains_Mono,
  Source_Serif_4,
} from 'next/font/google'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from 'next-intl/server'
import { notFound } from 'next/navigation'

import { routing } from '@/i18n/routing'
import { getSiteUrl } from '@/lib/site'
import { Providers } from '@/providers'
import '../globals.css'

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument-sans',
})

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-source-serif',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
})

type LocaleLayoutProps = Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>

/**
 * Return the supported locale params for static App Router analysis.
 *
 * @returns {{locale: string}[]} Supported locale params.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

/**
 * Build locale-aware document metadata for the current route tree.
 *
 * @param {Pick<LocaleLayoutProps, 'params'>} root0 - Metadata route props.
 * @param {Promise<{locale: string}>} root0.params - App Router locale params.
 * @returns {Promise<Metadata>} Translated metadata for the active locale.
 */
export async function generateMetadata({
  params,
}: Pick<LocaleLayoutProps, 'params'>): Promise<Metadata> {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  const t = await getTranslations({ locale, namespace: 'Root' })
  const siteName = t('title')

  return {
    metadataBase: new URL(getSiteUrl()),
    applicationName: siteName,
    title: {
      default: siteName,
      template: `%s · ${siteName}`,
    },
    description: t('description'),
    openGraph: {
      type: 'website',
      siteName,
      title: siteName,
      description: t('description'),
      locale: locale === 'es' ? 'es_ES' : 'en_US',
      alternateLocale: locale === 'es' ? 'en_US' : 'es_ES',
    },
    twitter: {
      card: 'summary_large_image',
      title: siteName,
      description: t('description'),
    },
  }
}

/** Document-level viewport, including the browser theme color. */
export const viewport: Viewport = {
  themeColor: '#F2ECE0',
}

/**
 * Provide locale-scoped messages to pages rendered through next-intl routing.
 *
 * @param {LocaleLayoutProps} root0 - Locale layout props.
 * @param {React.ReactNode} root0.children - Child route content.
 * @param {Promise<{locale: string}>} root0.params - App Router locale params.
 * @returns {Promise<React.ReactElement>} The locale provider wrapping route content.
 */
export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)

  const messages = await getMessages({ locale })
  const t = await getTranslations({ locale, namespace: 'Root' })

  const motion =
    process.env.VISUAL_REGRESSION_TEST_MODE === 'true' ? 'off' : 'full'

  return (
    <html lang={locale} data-theme="light" data-motion={motion}>
      <body
        className={`${instrumentSans.variable} ${sourceSerif.variable} ${jetbrainsMono.variable}`}
      >
        <noscript>
          <style>{`.ll-rise { opacity: 1 !important; transform: none !important; }`}</style>
        </noscript>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-skip-link focus:bg-[var(--accent)] focus:px-4 focus:py-2 focus:font-mono focus:text-xs focus:uppercase focus:tracking-widest focus:text-white"
        >
          {t('skipLink')}
        </a>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
