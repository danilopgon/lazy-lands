import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { NavLink } from '@/components/navigation/nav-link'

type LegalPageProps = { params: Promise<{ locale: string }> }

/**
 * Build locale-aware, non-indexed metadata for the privacy policy.
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
    title: t('privacyPage.metaTitle'),
    robots: { index: false, follow: false },
  }
}

/**
 * Privacy policy page — non-indexed GDPR/LOPDGDD notice for the Spanish market.
 *
 * @param {LegalPageProps} root0 - Route props.
 * @param {Promise<{locale: string}>} root0.params - App Router locale params.
 * @returns {Promise<React.ReactElement>} The privacy policy page element.
 */
export default async function PrivacyPage({ params }: LegalPageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Legal' })
  const b = (chunks: React.ReactNode) => <strong>{chunks}</strong>
  const mail = (chunks: React.ReactNode) => (
    <a href="mailto:contacto@danilopgon.com" className="text-[var(--accent)]">
      {chunks}
    </a>
  )

  return (
    <main id="main-content" className="mx-auto max-w-2xl px-6 py-16 font-serif">
      <NavLink
        href="/"
        className="font-mono text-xs uppercase tracking-widest text-[var(--ink-2)] hover:text-[var(--accent)]"
      >
        {t('backHome')}
      </NavLink>

      <h1 className="mt-8 font-serif text-4xl font-semibold leading-tight text-[var(--ink)]">
        {t('privacyPage.title')}
      </h1>

      <p className="mt-2 font-mono text-xs text-[var(--mute)]">
        {t('lastUpdated')}
      </p>

      <section className="mt-10 space-y-8 text-[var(--ink-2)]">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-[var(--ink)]">
            {t('privacyPage.controllerTitle')}
          </h2>
          <p className="mt-2">
            {t.rich('privacyPage.controllerBody', { b, mail })}
          </p>
        </div>

        <div>
          <h2 className="font-serif text-2xl font-semibold text-[var(--ink)]">
            {t('privacyPage.collectTitle')}
          </h2>
          <p className="mt-2">{t('privacyPage.collectIntro')}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>{t.rich('privacyPage.collectEmail', { b })}</li>
            <li>{t.rich('privacyPage.collectContent', { b })}</li>
            <li>{t.rich('privacyPage.collectTokens', { b })}</li>
          </ul>
        </div>

        <div>
          <h2 className="font-serif text-2xl font-semibold text-[var(--ink)]">
            {t('privacyPage.legalBasisTitle')}
          </h2>
          <p className="mt-2">{t.rich('privacyPage.legalBasisBody', { b })}</p>
        </div>

        <div>
          <h2 className="font-serif text-2xl font-semibold text-[var(--ink)]">
            {t('privacyPage.aiTitle')}
          </h2>
          <p className="mt-2">{t('privacyPage.aiIntro')}</p>
          <p className="mt-2">{t.rich('privacyPage.aiReuse', { b })}</p>
          <p className="mt-2">{t.rich('privacyPage.aiBasis', { b })}</p>
          <p className="mt-2">{t.rich('privacyPage.aiCaution', { b })}</p>
          <p className="mt-2">{t.rich('privacyPage.aiPrivateNote', { b })}</p>
          <p className="mt-3">{t('privacyPage.aiProvidersIntro')}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>{t.rich('privacyPage.aiProviderGemini', { b })}</li>
            <li>{t.rich('privacyPage.aiProviderGroq', { b })}</li>
            <li>{t.rich('privacyPage.aiProviderMistral', { b })}</li>
            <li>{t.rich('privacyPage.aiProviderCerebras', { b })}</li>
          </ul>
        </div>

        <div>
          <h2 className="font-serif text-2xl font-semibold text-[var(--ink)]">
            {t('privacyPage.transfersTitle')}
          </h2>
          <p className="mt-2">{t('privacyPage.transfersBody')}</p>
        </div>

        <div>
          <h2 className="font-serif text-2xl font-semibold text-[var(--ink)]">
            {t('privacyPage.rightsTitle')}
          </h2>
          <p className="mt-2">{t('privacyPage.rightsIntro')}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>{t.rich('privacyPage.rightAccess', { b })}</li>
            <li>{t.rich('privacyPage.rightRectify', { b })}</li>
            <li>{t.rich('privacyPage.rightErasure', { b })}</li>
            <li>{t.rich('privacyPage.rightRestrict', { b })}</li>
            <li>{t.rich('privacyPage.rightPortability', { b })}</li>
            <li>{t.rich('privacyPage.rightObject', { b })}</li>
            <li>{t.rich('privacyPage.rightComplaint', { b })}</li>
          </ul>
          <p className="mt-3">
            {t.rich('privacyPage.rightsContact', {
              b: (chunks) => (
                <strong className="font-mono text-sm text-[var(--ink)]">
                  {chunks}
                </strong>
              ),
            })}
          </p>
        </div>

        <div>
          <h2 className="font-serif text-2xl font-semibold text-[var(--ink)]">
            {t('privacyPage.retentionTitle')}
          </h2>
          <p className="mt-2">{t('privacyPage.retentionBody')}</p>
        </div>

        <div>
          <h2 className="font-serif text-2xl font-semibold text-[var(--ink)]">
            {t('privacyPage.noSharingTitle')}
          </h2>
          <p className="mt-2">{t('privacyPage.noSharingBody')}</p>
        </div>
      </section>
    </main>
  )
}
