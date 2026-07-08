'use client'

import { useTranslations } from 'next-intl'

import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

type EntityNavProps = {
  /** The campaign whose sections this nav switches between. */
  campaignId: string
}

/**
 * Contextual sub-navigation for a single campaign: Overview, NPCs, Factions,
 * and Arcs. Rendered below the AppHeader on `/campaigns/[id]` routes so the DM
 * can move between a campaign's sections without going through the breadcrumb.
 *
 * Only the sections that exist as routes today are listed; Memory and Sessions
 * from the handoff Shell are intentionally omitted until those routes ship.
 *
 * @param {EntityNavProps} root0 - Nav props.
 * @param {string} root0.campaignId - The active campaign id.
 * @returns {React.ReactElement} The campaign section navigation.
 */
export function EntityNav({ campaignId }: EntityNavProps) {
  const t = useTranslations('Nav')
  const pathname = usePathname()
  const base = `/campaigns/${campaignId}`

  const items = [
    { key: 'overview', href: base, active: pathname === base },
    {
      key: 'npcs',
      href: `${base}/npcs`,
      active: pathname.startsWith(`${base}/npcs`),
    },
    {
      key: 'factions',
      href: `${base}/factions`,
      active: pathname.startsWith(`${base}/factions`),
    },
    {
      key: 'arcs',
      href: `${base}/arcs`,
      active: pathname.startsWith(`${base}/arcs`),
    },
  ]

  return (
    <nav
      aria-label={t('campaignSections')}
      className="flex items-center gap-6 border-b border-[var(--line)] px-4 llg:px-10"
    >
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={item.active ? 'page' : undefined}
          className={cn(
            '-mb-px border-b-2 py-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] transition-colors',
            item.active
              ? 'border-[var(--accent)] text-[var(--ink)]'
              : 'border-transparent text-[var(--ink-2)] hover:text-[var(--ink)]'
          )}
        >
          {t(item.key)}
        </Link>
      ))}
    </nav>
  )
}
