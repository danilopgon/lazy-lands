'use client'

import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { demoHrefs } from '@/lib/demo/hrefs'
import { demoCampaign } from '@/lib/demo/fixtures'

type DemoBreadcrumbProps = {
  /** The current (leaf) segment label. */
  title: string
}

/**
 * Demo-scoped breadcrumb: the campaign home (inside `/demo`) followed by the
 * current screen. Mirrors the authenticated breadcrumbs but never links out of
 * the demo island.
 *
 * @param {object} root0 - Breadcrumb props.
 * @param {string} root0.title - The current screen label.
 * @returns {React.ReactElement} The breadcrumb nav element.
 */
export function DemoBreadcrumb({ title }: DemoBreadcrumbProps) {
  const t = useTranslations('Demo')

  return (
    <nav className="mb-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]">
      <Link href={demoHrefs.campaign} className="hover:text-[var(--ink)]">
        {t('breadcrumbRoot')}
      </Link>{' '}
      /{' '}
      <Link href={demoHrefs.campaign} className="hover:text-[var(--ink)]">
        {demoCampaign.title}
      </Link>{' '}
      / <b className="text-[var(--ink)]">{title}</b>
    </nav>
  )
}
