import Link from 'next/link'

import { WorldStateEditor } from './world-state-editor'

import { formatShortDate } from '@/lib/format'

import type { CampaignDetailResponse } from '@/lib/campaigns/schemas'

type CampaignDetailViewProps = {
  campaign: CampaignDetailResponse
}

/**
 * Campaign detail presentational view — breadcrumb, header, stat bar, two-column layout.
 *
 * @param {object} root0 - The campaign detail view props.
 * @param {CampaignDetailResponse} root0.campaign - The campaign detail to display.
 * @returns {React.ReactElement} The campaign detail view element.
 */
export function CampaignDetailView({ campaign }: CampaignDetailViewProps) {
  const kicker = [campaign.system, campaign.tone].filter(Boolean).join(' · ')
  // `active`/`dormant` arcs are the unresolved threads that need attention;
  // `resolved`/`discarded` are terminal (design Decision 9).
  const openArcs = campaign.arcs.filter(
    (arc) => arc.status === 'active' || arc.status === 'dormant'
  )
  const visibleArcs = openArcs.slice(0, 3)

  return (
    <div className="ll-view-enter">
      <nav className="mb-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]">
        <Link href="/dashboard" className="hover:text-[var(--ink)]">
          Campaigns
        </Link>{' '}
        / <b className="text-[var(--ink)]">{campaign.title}</b>
      </nav>

      <div className="flex items-start justify-between gap-4">
        <div>
          {kicker && (
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
              Campaign · {kicker}
            </p>
          )}
          <h1 className="mt-2 font-serif text-[38px] font-semibold tracking-[-0.03em] text-[var(--ink)]">
            {campaign.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-2)]">
            Updated {formatShortDate(campaign.updated_at)}
          </p>
        </div>
      </div>

      <dl className="mt-6 grid border-2 border-[var(--border)] bg-[var(--paper)] shadow-[6px_6px_0_var(--shadow)] llg:grid-flow-col llg:auto-cols-fr">
        <Link
          href={`/campaigns/${campaign.id}/npcs`}
          className="border-b-2 border-[var(--border)] p-4 last:border-b-0 llg:border-r-2 llg:border-b-0 llg:last:border-r-0 hover:bg-[var(--paper-2)] transition-colors"
        >
          <dt className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--mute)]">
            NPCs
          </dt>
          <dd className="mt-1 font-serif text-3xl font-semibold leading-none tracking-[-0.02em] text-[var(--ink)]">
            {campaign.npcs.length}
          </dd>
        </Link>
        <Link
          href={`/campaigns/${campaign.id}/factions`}
          className="border-b-2 border-[var(--border)] p-4 last:border-b-0 llg:border-r-2 llg:border-b-0 llg:last:border-r-0 hover:bg-[var(--paper-2)] transition-colors"
        >
          <dt className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--mute)]">
            Factions
          </dt>
          <dd className="mt-1 font-serif text-3xl font-semibold leading-none tracking-[-0.02em] text-[var(--ink)]">
            {campaign.factions.length}
          </dd>
        </Link>
        <Link
          href={`/campaigns/${campaign.id}/arcs`}
          className="border-b-2 border-[var(--border)] p-4 last:border-b-0 hover:bg-[var(--paper-2)] transition-colors"
        >
          <dt className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--mute)]">
            Arcs
          </dt>
          <dd className="mt-1 font-serif text-3xl font-semibold leading-none tracking-[-0.02em] text-[var(--ink)]">
            {campaign.arcs.length}
          </dd>
        </Link>
      </dl>

      <div className="mt-7 grid gap-7 llg:grid-cols-[1fr_340px]">
        <div>
          <div className="ll-rule-anim">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[11px] text-[var(--ink-3)]">
                /01
              </span>
              <h3 className="font-serif text-[16px] font-semibold text-[var(--ink)]">
                The state of the world
              </h3>
            </div>
          </div>
          <div className="mt-3">
            <WorldStateEditor
              campaignId={campaign.id}
              initialValue={campaign.world_state}
            />
          </div>

          <hr className="my-7 border-t border-dotted border-[var(--dotted)]" />

          <div className="ll-rule-anim">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[11px] text-[var(--ink-3)]">
                /02
              </span>
              <h3 className="font-serif text-[16px] font-semibold text-[var(--ink)]">
                Recent sessions
              </h3>
            </div>
          </div>
          <div className="mt-3 rounded border-2 border-dashed border-[var(--dotted)] bg-[var(--paper)] p-5 opacity-60">
            <p className="text-sm italic text-[var(--ink-3)]">
              Coming in a later chapter
            </p>
          </div>
        </div>

        <div>
          <div className="ll-rule-anim">
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[11px] text-[var(--ink-3)]">
                  /03
                </span>
                <h3 className="font-serif text-[16px] font-semibold text-[var(--ink)]">
                  Arcs needing attention
                </h3>
              </div>
              <Link
                href={`/campaigns/${campaign.id}/arcs`}
                className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)] hover:underline"
              >
                All arcs →
              </Link>
            </div>
          </div>
          <div className="mt-3 space-y-3">
            {visibleArcs.map((arc) => (
              <div
                key={arc.id}
                className="border-b border-dotted border-[var(--dotted)] pb-3 last:border-b-0"
              >
                <div className="font-serif text-[14px] font-semibold text-[var(--ink)]">
                  {arc.title}
                </div>
                {arc.description && (
                  <div className="mt-0.5 text-sm text-[var(--ink-2)]">
                    {arc.description}
                  </div>
                )}
                <span className="mt-1 inline-block font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
                  {arc.status}
                </span>
              </div>
            ))}
          </div>

          <hr className="my-7 border-t border-dotted border-[var(--dotted)]" />

          <div className="ll-rule-anim">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[11px] text-[var(--ink-3)]">
                /04
              </span>
              <h3 className="font-serif text-[16px] font-semibold text-[var(--ink)]">
                Active memories
              </h3>
            </div>
          </div>
          <div className="mt-3 rounded border-2 border-dashed border-[var(--dotted)] bg-[var(--paper)] p-5 opacity-60">
            <p className="text-sm italic text-[var(--ink-3)]">
              Coming in a later chapter
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
