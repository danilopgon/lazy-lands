'use client'

import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { DemoBreadcrumb } from '@/components/demo/demo-breadcrumb'
import { useDemoStore } from '@/lib/demo/store'

import type { CampaignDetailResponse } from '@/lib/campaigns/schemas'

type DemoEntityScreenProps = {
  /** Mono kicker above the title, e.g. "Campaign · NPCs". */
  kicker: string
  /** Screen title and last breadcrumb segment. */
  title: string
  /** Label for the primary "+ New …" action. */
  addLabel: string
  /** Builds the count subtitle from the demo campaign. */
  subtitle: (campaign: CampaignDetailResponse) => string
  /** Invoked when the primary add action is pressed. */
  onAdd: () => void
  /** Renders the entity rows from the demo campaign. */
  children: (campaign: CampaignDetailResponse) => ReactNode
}

/**
 * Demo counterpart of the authenticated `EntityListScreen`. Same header,
 * breadcrumb, and add-action layout, but it reads the campaign from the
 * in-memory demo store instead of fetching it — so there is no loading, error,
 * or not-found path to model.
 *
 * @param {DemoEntityScreenProps} root0 - The screen props.
 * @param {string} root0.kicker - Mono kicker above the title.
 * @param {string} root0.title - Screen title and breadcrumb leaf.
 * @param {string} root0.addLabel - Primary add action label.
 * @param {(campaign: CampaignDetailResponse) => string} root0.subtitle - Count subtitle builder.
 * @param {() => void} root0.onAdd - Primary add action handler.
 * @param {(campaign: CampaignDetailResponse) => React.ReactNode} root0.children - Row renderer.
 * @returns {React.ReactElement} The demo entity list screen element.
 */
export function DemoEntityScreen({
  kicker,
  title,
  addLabel,
  subtitle,
  onAdd,
  children,
}: DemoEntityScreenProps) {
  const { campaign } = useDemoStore()

  return (
    <main
      id="main-content"
      className="ll-view-enter ll-workspace mx-auto max-w-[1100px] px-6 py-16"
    >
      <DemoBreadcrumb title={title} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
            {kicker}
          </p>
          <h1 className="mt-2 font-serif text-[38px] font-semibold tracking-[-0.03em] text-[var(--ink)]">
            {title}
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-2)]">
            {subtitle(campaign)}
          </p>
        </div>
        <Button variant="ink" onClick={onAdd}>
          {addLabel}
        </Button>
      </div>

      <div className="mt-6">{children(campaign)}</div>
    </main>
  )
}
