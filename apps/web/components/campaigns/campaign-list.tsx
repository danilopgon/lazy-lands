'use client'

import { useState } from 'react'
import Link from 'next/link'

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

  if (campaigns.length === 0) {
    return (
      <EmptyState
        className="mt-7"
        title="Your chronicle starts here"
        description="Paste your existing campaign notes and the Scribe will draft your NPCs, factions, world state and open arcs, for you to review before anything becomes canon."
        action={
          <Button asChild variant="accent">
            <Link href="/campaigns/new">+ Create your first campaign</Link>
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
          placeholder="Search campaigns…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="font-mono text-[11px] text-[var(--ink-3)]">
          {filtered.length} of {campaigns.length}
        </span>
      </div>
      <div className="ll-camp-grid mt-3 grid grid-cols-1 gap-4 llg:grid-cols-2">
        {filtered.map((c) => (
          <CampaignCard key={c.id} campaign={c} />
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="mt-4">
          <EmptyState
            ornament="✦"
            title="No campaigns match that search"
            description="Try a different name or game system."
          />
        </div>
      )}
    </>
  )
}
