'use client'

import { useState } from 'react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { CampaignCard } from '@/components/campaigns/campaign-card'

import type { CampaignSummary } from '@/lib/campaigns/schemas'

type CampaignListProps = {
  campaigns: CampaignSummary[]
}

/**
 * Campaign list with client-side search — renders the grid or appropriate empty states.
 *
 * @param {object} root0 - The campaign list props.
 * @param {CampaignSummary[]} root0.campaigns - The campaigns to display.
 * @returns {React.ReactElement} The campaign list element.
 */
export function CampaignList({ campaigns }: CampaignListProps) {
  const [query, setQuery] = useState('')
  const t = useTranslations('Dashboard')

  if (campaigns.length === 0) {
    return (
      <EmptyState
        className="mt-7"
        title={t('emptyTitle')}
        description={t('emptyDescription')}
        action={
          <Button asChild variant="accent">
            <Link href="/campaigns/new">{t('emptyAction')}</Link>
          </Button>
        }
      />
    )
  }

  const filtered = query
    ? campaigns.filter((c) => {
        const q = query.toLowerCase()
        return (
          c.title.toLowerCase().includes(q) ||
          (c.system ?? '').toLowerCase().includes(q)
        )
      })
    : campaigns

  return (
    <>
      <div className="mt-5 flex items-center gap-2.5">
        <Input
          className="max-w-[300px]"
          aria-label={t('searchPlaceholder')}
          placeholder={`${t('searchPlaceholder')}…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="font-mono text-[11px] text-[var(--ink-3)]">
          {t('helperCount', {
            visible: filtered.length,
            total: campaigns.length,
          })}
        </span>
      </div>
      <div className="ll-camp-grid mt-3 grid grid-cols-1 gap-4 llg:grid-cols-2 min-[1440px]:grid-cols-3">
        {filtered.map((c) => (
          <CampaignCard key={c.id} campaign={c} />
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="mt-4">
          <EmptyState
            ornament="✦"
            title={t('emptySearchTitle')}
            description={t('emptySearchDescription')}
          />
        </div>
      )}
    </>
  )
}
