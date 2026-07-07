import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'

type LegalPageProps = { params: Promise<{ locale: string }> }

/**
 * Build locale-aware, non-indexed metadata for the cookie policy.
 *
 * @param {LegalPageProps} root0 - Route props.
 * @param {Promise<{locale: string}>} root0.params - App Router locale params.
 * @returns {Promise<Metadata>} Translated title with robots noindex.
 */
export async function generateMetadata({
  params,
}: LegalPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Legal' })

  return {
    title: t('cookiesPage.metaTitle'),
    robots: { index: false, follow: false },
  }
}

/**
 * Cookie policy page — non-indexed, lists all storage items in use.
 *
 * @param {LegalPageProps} root0 - Route props.
 * @param {Promise<{locale: string}>} root0.params - App Router locale params.
 * @returns {Promise<React.ReactElement>} The cookie policy page element.
 */
export default async function CookiesPage({ params }: LegalPageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Legal' })
  const code = (chunks: React.ReactNode) => (
    <code className="font-mono text-xs">{chunks}</code>
  )

  return (
    <main id="main-content" className="mx-auto max-w-2xl px-6 py-16 font-serif">
      <Link
        href="/"
        className="font-mono text-xs uppercase tracking-widest text-[var(--ink-2)] hover:text-[var(--accent)]"
      >
        {t('backHome')}
      </Link>

      <h1 className="mt-8 font-serif text-4xl font-semibold leading-tight text-[var(--ink)]">
        {t('cookiesPage.title')}
      </h1>

      <p className="mt-2 font-mono text-xs text-[var(--mute)]">
        {t('lastUpdated')}
      </p>

      <section className="mt-10 space-y-6 text-[var(--ink-2)]">
        <p>{t('cookiesPage.intro')}</p>

        <h2 className="font-serif text-2xl font-semibold text-[var(--ink)]">
          {t('cookiesPage.exemptionTitle')}
        </h2>
        <p>{t('cookiesPage.exemptionBody')}</p>

        <h2 className="font-serif text-2xl font-semibold text-[var(--ink)]">
          {t('cookiesPage.itemsTitle')}
        </h2>

        <div className="space-y-4 border-l-2 border-[var(--line)] pl-4">
          <div>
            <p className="font-mono text-sm font-semibold text-[var(--ink)]">
              sb-&lt;project-ref&gt;-auth-token
            </p>
            <p className="mt-1 text-sm">
              {t.rich('cookiesPage.authTokenDesc', { code })}
            </p>
          </div>

          <div>
            <p className="font-mono text-sm font-semibold text-[var(--ink)]">
              ll-cookie-consent
            </p>
            <p className="mt-1 text-sm">
              {t.rich('cookiesPage.consentDesc', { code })}
            </p>
          </div>

          <div>
            <p className="font-mono text-sm font-semibold text-[var(--ink)]">
              ll-announcement-dismissed
            </p>
            <p className="mt-1 text-sm">
              {t.rich('cookiesPage.announcementDesc', { code })}
            </p>
          </div>
        </div>

        <h2 className="font-serif text-2xl font-semibold text-[var(--ink)]">
          {t('cookiesPage.noTrackingTitle')}
        </h2>
        <p>{t('cookiesPage.noTrackingBody')}</p>

        <h2 className="font-serif text-2xl font-semibold text-[var(--ink)]">
          {t('cookiesPage.contactTitle')}
        </h2>
        <p>
          {t.rich('cookiesPage.contactBody', {
            mail: (chunks) => (
              <a
                href="mailto:contacto@danilopgon.com"
                className="text-[var(--accent)]"
              >
                {chunks}
              </a>
            ),
          })}
        </p>
      </section>
    </main>
  )
}
