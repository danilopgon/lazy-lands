'use client'

import Link from 'next/link'

import { formatShortDate } from '@/lib/format'
import { getClientLocale, getUiMessages } from '@/lib/i18n/ui-copy'

import type { CampaignSummary } from '@/lib/campaigns/schemas'

type CampaignCardProps = {
  campaign: CampaignSummary
}

/**
 * Clickable campaign card — links to the campaign detail page.
 *
 * @param {object} root0 - The campaign card props.
 * @param {CampaignSummary} root0.campaign - The campaign summary to display.
 * @returns {React.ReactElement} The campaign card link element.
 */
export function CampaignCard({ campaign }: CampaignCardProps) {
  const locale = getClientLocale()
  const copy = getUiMessages(locale).Dashboard
  // Handoff shows five stat columns. Sessions and Memories have no backend data
  // until Block 7, so they render as honest "—" placeholders (never fabricated
  // counts) while NPCs/Factions/Arcs are live from `GET /campaigns`. The Arcs
  // count is the total (all statuses), matching the detail stat bar.
  const stats: { value: number | string; label: string }[] = [
    { value: '—', label: copy.stats.sessions },
    { value: campaign.npc_count, label: copy.stats.npcs },
    { value: campaign.faction_count, label: copy.stats.factions },
    { value: '—', label: copy.stats.memories },
    { value: campaign.arc_count, label: copy.stats.arcs },
  ]

  const subtitle = [campaign.system, campaign.tone].filter(Boolean).join(' · ')

  return (
    <Link
      href={`/campaigns/${campaign.id}`}
      className="ll-view-enter flex cursor-pointer flex-col border-2 border-[var(--border)] bg-[var(--paper)] shadow-[6px_6px_0_var(--shadow)] transition-[transform,box-shadow] duration-100 ease-out hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:shadow-[4px_4px_0_var(--shadow)]"
    >
      <div className="border-b border-[var(--line)] px-5 py-4">
        <div className="font-serif text-[20px] font-semibold tracking-[-0.01em] text-[var(--ink)]">
          {campaign.title}
        </div>
        {subtitle ? (
          <div className="mt-1 text-sm text-[var(--ink-2)]">{subtitle}</div>
        ) : null}
      </div>
      <div className="flex px-5 py-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex-1 border-r border-[var(--line)] px-2.5 first:pl-0 last:border-r-0 last:pr-0"
          >
            <div className="font-serif text-[19px] font-semibold text-[var(--ink)]">
              {stat.value}
            </div>
            <div className="text-[11px] text-[var(--ink-2)]">{stat.label}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-[var(--line)] px-5 py-2.5">
        <span className="text-xs text-[var(--ink-3)]">
          {copy.updated.replace(
            '{date}',
            formatShortDate(campaign.updated_at, locale)
          )}
        </span>
        <span className="text-sm font-medium text-[var(--accent)]">
          {copy.openChronicle}
        </span>
      </div>
    </Link>
  )
}
