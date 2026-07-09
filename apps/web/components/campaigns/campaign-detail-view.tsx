/* eslint-disable jsdoc/require-param, jsdoc/require-returns */
'use client'

import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'

import { WorldStateEditor } from './world-state-editor'
import { RecentSessions } from './recent-sessions'

import { useAppLocale } from '@/i18n/use-app-locale'
import { formatShortDate } from '@/lib/format'
import { getSessions } from '@/lib/sessions/api'
import { getMemoryFacts } from '@/lib/memory/api'

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
  const t = useTranslations('Campaigns')
  const te = useTranslations('Entities')
  const locale = useAppLocale()
  const kicker = [campaign.system, campaign.tone].filter(Boolean).join(' · ')
  // `active`/`dormant` arcs are the unresolved threads that need attention;
  // `resolved`/`discarded` are terminal (design Decision 9).
  const openArcs = campaign.arcs.filter(
    (arc) => arc.status === 'active' || arc.status === 'dormant'
  )
  const visibleArcs = openArcs.slice(0, 3)
  const sessionsQuery = useQuery({
    queryKey: ['campaign', campaign.id, 'sessions'],
    queryFn: () => getSessions(campaign.id),
  })
  const memoriesQuery = useQuery({
    queryKey: ['campaign', campaign.id, 'memory-facts', 'active'],
    queryFn: () => getMemoryFacts(campaign.id, { status: 'active' }),
  })

  return (
    <div className="ll-view-enter">
      <nav className="mb-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]">
        <Link href="/dashboard" className="hover:text-[var(--ink)]">
          {t('breadcrumbRoot')}
        </Link>{' '}
        / <b className="text-[var(--ink)]">{campaign.title}</b>
      </nav>

      <div className="flex items-start justify-between gap-4">
        <div>
          {kicker && (
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
              {t('detail.kicker', { kicker })}
            </p>
          )}
          <h1 className="mt-2 font-serif text-[38px] font-semibold tracking-[-0.03em] text-[var(--ink)]">
            {campaign.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-2)]">
            {t('detail.updated', {
              date: formatShortDate(campaign.updated_at, locale),
            })}
          </p>
        </div>
      </div>

      <dl className="mt-6 grid border-2 border-[var(--border)] bg-[var(--paper)] shadow-[6px_6px_0_var(--shadow)] llg:grid-flow-col llg:auto-cols-fr">
        <Link
          href={`/campaigns/${campaign.id}/npcs`}
          className="border-b-2 border-[var(--border)] p-4 last:border-b-0 llg:border-r-2 llg:border-b-0 llg:last:border-r-0 hover:bg-[var(--paper-2)] transition-colors"
        >
          <dt className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--mute)]">
            {t('detail.statNpcs')}
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
            {t('detail.statFactions')}
          </dt>
          <dd className="mt-1 font-serif text-3xl font-semibold leading-none tracking-[-0.02em] text-[var(--ink)]">
            {campaign.factions.length}
          </dd>
        </Link>
        <Link
          href={`/campaigns/${campaign.id}/arcs`}
          className="border-b-2 border-[var(--border)] p-4 last:border-b-0 llg:border-r-2 llg:border-b-0 llg:last:border-r-0 hover:bg-[var(--paper-2)] transition-colors"
        >
          <dt className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--mute)]">
            {t('detail.statArcs')}
          </dt>
          <dd className="mt-1 font-serif text-3xl font-semibold leading-none tracking-[-0.02em] text-[var(--ink)]">
            {campaign.arcs.length}
          </dd>
        </Link>
        <Link
          href={`/campaigns/${campaign.id}/memory/review`}
          className="border-b-2 border-[var(--border)] p-4 last:border-b-0 hover:bg-[var(--paper-2)] transition-colors"
        >
          <dt className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--mute)]">
            {t('detail.statMemory')}
          </dt>
          <dd className="mt-1 font-serif text-3xl font-semibold leading-none tracking-[-0.02em] text-[var(--ink)]">
            {memoriesQuery.data?.length ?? 0}
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
                {t('detail.worldStateHeading')}
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
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[11px] text-[var(--ink-3)]">
                  /02
                </span>
                <h3 className="font-serif text-[16px] font-semibold text-[var(--ink)]">
                  {t('detail.recentSessions')}
                </h3>
              </div>
              <Link
                href={`/campaigns/${campaign.id}/sessions/new`}
                className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)] hover:underline"
              >
                {t('detail.logSession')}
              </Link>
            </div>
          </div>
          <div className="mt-3">
            <RecentSessions
              campaignId={campaign.id}
              sessions={sessionsQuery.data}
              isLoading={sessionsQuery.isLoading}
              isError={sessionsQuery.isError}
            />
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
                  {t('detail.arcsNeedingAttention')}
                </h3>
              </div>
              <Link
                href={`/campaigns/${campaign.id}/arcs`}
                className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)] hover:underline"
              >
                {t('detail.allArcs')}
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
                  {te(`status.${arc.status}`)}
                </span>
              </div>
            ))}
          </div>

          <hr className="my-7 border-t border-dotted border-[var(--dotted)]" />

          <div className="ll-rule-anim">
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[11px] text-[var(--ink-3)]">
                  /04
                </span>
                <h3 className="font-serif text-[16px] font-semibold text-[var(--ink)]">
                  {t('detail.activeMemories')}
                </h3>
              </div>
              <Link
                href={`/campaigns/${campaign.id}/memory/review`}
                className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)] hover:underline"
              >
                {t('detail.memoryReview')}
              </Link>
            </div>
          </div>
          <ActiveMemoriesPanel
            isLoading={memoriesQuery.isLoading}
            isError={memoriesQuery.isError}
            memories={memoriesQuery.data ?? []}
            retryLabel={t('screen.retry')}
            onRetry={() => memoriesQuery.refetch()}
          />
        </div>
      </div>
    </div>
  )
}

/** Renders live active memories without fabricating placeholder chronicle entries. */
function ActiveMemoriesPanel({
  isLoading,
  isError,
  memories,
  retryLabel,
  onRetry,
}: {
  isLoading: boolean
  isError: boolean
  memories: Awaited<ReturnType<typeof getMemoryFacts>>
  retryLabel: string
  onRetry: () => void
}) {
  const t = useTranslations('Campaigns')

  if (isLoading) {
    return (
      <div className="mt-3 border-2 border-[var(--border)] bg-[var(--paper)] p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--ink-3)]">
          {t('detail.memoriesLoading')}
        </p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="mt-3 border-2 border-[var(--danger)] bg-[var(--danger-wash)] p-5 text-[var(--danger)]">
        <p className="text-sm">{t('detail.memoriesLoadError')}</p>
        <button
          type="button"
          className="mt-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] underline"
          onClick={onRetry}
        >
          {retryLabel}
        </button>
      </div>
    )
  }

  if (memories.length === 0) {
    return (
      <div className="mt-3 border-2 border-dashed border-[var(--dotted)] bg-[var(--paper)] p-5">
        <p className="text-sm italic text-[var(--ink-3)]">
          {t('detail.noActiveMemories')}
        </p>
      </div>
    )
  }

  return (
    <div className="mt-3 border-2 border-[var(--border)] bg-[var(--paper)] px-4 shadow-[4px_4px_0_var(--shadow)]">
      {memories.map((memory) => (
        <div
          key={memory.id}
          className="border-b border-dotted border-[var(--dotted)] py-3 last:border-b-0"
        >
          {memory.type ? (
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
              {memory.type}
            </span>
          ) : null}
          <p className="mt-1 font-serif text-[14.5px] leading-relaxed text-[var(--ink)]">
            {memory.content}
          </p>
          <p className="mt-1 text-xs text-[var(--ink-3)]">
            {t('detail.memorySource', {
              source: memory.source_session_id
                ? t('detail.linkedMemory')
                : t('detail.manualMemory'),
            })}
          </p>
        </div>
      ))}
    </div>
  )
}
