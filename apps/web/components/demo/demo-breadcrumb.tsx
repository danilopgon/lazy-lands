'use client'

import { useTranslations } from 'next-intl'

import { NavLink } from '@/components/navigation/nav-link'
import { demoHrefs } from '@/lib/demo/hrefs'
import { useDemoStore } from '@/lib/demo/store'

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
  const store = useDemoStore()

  return (
    <nav className="mb-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]">
      <NavLink href={demoHrefs.campaign} className="hover:text-[var(--ink)]">
        {t('breadcrumbRoot')}
      </NavLink>{' '}
      /{' '}
      <NavLink href={demoHrefs.campaign} className="hover:text-[var(--ink)]">
        {store.campaign.title}
      </NavLink>{' '}
      / <b className="text-[var(--ink)]">{title}</b>
    </nav>
  )
}
