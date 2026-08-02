'use client'

import { NavLink, PENDING_SLOT_OVERLAY } from '@/components/navigation/nav-link'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'

import { WorldStateEditor } from './world-state-editor'
import { RecentSessions } from './recent-sessions'

import { useAppLocale } from '@/i18n/use-app-locale'
import { formatShortDate } from '@/lib/format'
import { getSessions } from '@/lib/sessions/api'
import {
  getMemoryTypeMessageKey,
  humanizeMemoryType,
} from '@/lib/sessions/memory-type-label'
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
  const priorityRank = { high: 0, medium: 1, low: 2 } as const
  const visibleArcs = campaign.arcs
    .filter((arc) => arc.status === 'active' || arc.status === 'dormant')
    .toSorted(
      (left, right) =>
        (left.priority ? priorityRank[left.priority] : 3) -
        (right.priority ? priorityRank[right.priority] : 3)
    )
    .slice(0, 3)
  const sessionsQuery = useQuery({
    queryKey: ['campaign', campaign.id, 'sessions'],
    queryFn: () => getSessions(campaign.id),
  })
  const memoriesQuery = useQuery({
    queryKey: ['campaign', campaign.id, 'memory-facts', 'active'],
    queryFn: () => getMemoryFacts(campaign.id, { status: 'active' }),
  })
  const activeMemoryCount = memoriesQuery.data?.length ?? 0
  const hasHiddenActiveMemories = activeMemoryCount > 3

  return (
    <div className="ll-view-enter">
      <nav className="mb-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]">
        <NavLink href="/dashboard" className="hover:text-[var(--ink)]">
          {t('breadcrumbRoot')}
        </NavLink>{' '}
        / <b className="text-[var(--ink)]">{campaign.title}</b>
      </nav>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
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
        <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:shrink-0">
          <NavLink
            href={`/campaigns/${campaign.id}/sessions/new`}
            pendingSlotClassName={PENDING_SLOT_OVERLAY}
            className="relative inline-flex h-11 items-center justify-center border-2 border-[var(--border)] bg-transparent px-5 py-2 font-sans text-sm font-semibold text-[var(--ink)] shadow-[3px_3px_0_var(--shadow)] transition-[transform,box-shadow,background] duration-100 ease-out hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:bg-[var(--paper-2)] hover:shadow-[1.5px_1.5px_0_var(--shadow)]"
          >
            {t('detail.logSessionHeader')}
          </NavLink>
          <NavLink
            href={`/campaigns/${campaign.id}/prepare`}
            pendingSlotClassName={PENDING_SLOT_OVERLAY}
            className="relative inline-flex h-11 items-center justify-center border-2 border-[var(--border)] bg-[var(--accent)] px-5 py-2 font-sans text-sm font-semibold text-[var(--bg-contrast)] shadow-[3px_3px_0_var(--shadow)] transition-[transform,box-shadow,background] duration-100 ease-out hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:shadow-[1.5px_1.5px_0_var(--shadow)]"
          >
            {t('detail.prepareNextHeader')}
          </NavLink>
        </div>
      </div>

      <dl className="mt-6 grid border-2 border-[var(--border)] bg-[var(--paper)] shadow-[6px_6px_0_var(--shadow)] llg:grid-flow-col llg:auto-cols-fr">
        <NavLink
          href={`/campaigns/${campaign.id}/npcs`}
          pendingSlotClassName="absolute right-3 top-3"
          className="relative border-b-2 border-[var(--border)] p-4 last:border-b-0 llg:border-r-2 llg:border-b-0 llg:last:border-r-0 hover:bg-[var(--paper-2)] transition-colors"
        >
          <dt className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--mute)]">
            {t('detail.statNpcs')}
          </dt>
          <dd className="mt-1 font-serif text-3xl font-semibold leading-none tracking-[-0.02em] text-[var(--ink)]">
            {campaign.npcs.length}
          </dd>
        </NavLink>
        <NavLink
          href={`/campaigns/${campaign.id}/factions`}
          pendingSlotClassName="absolute right-3 top-3"
          className="relative border-b-2 border-[var(--border)] p-4 last:border-b-0 llg:border-r-2 llg:border-b-0 llg:last:border-r-0 hover:bg-[var(--paper-2)] transition-colors"
        >
          <dt className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--mute)]">
            {t('detail.statFactions')}
          </dt>
          <dd className="mt-1 font-serif text-3xl font-semibold leading-none tracking-[-0.02em] text-[var(--ink)]">
            {campaign.factions.length}
          </dd>
        </NavLink>
        <NavLink
          href={`/campaigns/${campaign.id}/arcs`}
          pendingSlotClassName="absolute right-3 top-3"
          className="relative border-b-2 border-[var(--border)] p-4 last:border-b-0 llg:border-r-2 llg:border-b-0 llg:last:border-r-0 hover:bg-[var(--paper-2)] transition-colors"
        >
          <dt className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--mute)]">
            {t('detail.statArcs')}
          </dt>
          <dd className="mt-1 font-serif text-3xl font-semibold leading-none tracking-[-0.02em] text-[var(--ink)]">
            {campaign.arcs.length}
          </dd>
        </NavLink>
        <NavLink
          href={`/campaigns/${campaign.id}/memory/review`}
          pendingSlotClassName="absolute right-3 top-3"
          className="relative border-b-2 border-[var(--border)] p-4 last:border-b-0 hover:bg-[var(--paper-2)] transition-colors"
        >
          <dt className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--mute)]">
            {t('detail.statMemory')}
          </dt>
          <dd className="mt-1 font-serif text-3xl font-semibold leading-none tracking-[-0.02em] text-[var(--ink)]">
            {memoriesQuery.data?.length ?? 0}
          </dd>
        </NavLink>
      </dl>

      <div className="mt-7 grid gap-7 llg:grid-cols-[1fr_340px] min-[1440px]:grid-cols-[minmax(0,75ch)_minmax(20rem,1fr)]">
        <div className="ll-workspace-main">
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
              <NavLink
                href={`/campaigns/${campaign.id}/sessions/new`}
                className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)] hover:underline"
              >
                {t('detail.logSession')}
              </NavLink>
            </div>
          </div>
          <div className="mt-3">
            <RecentSessions
              campaignId={campaign.id}
              sessions={sessionsQuery.data}
              isLoading={sessionsQuery.isPending}
              isError={sessionsQuery.isError}
            />
          </div>
        </div>

        <div className="ll-workspace-context">
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
              <NavLink
                href={`/campaigns/${campaign.id}/arcs`}
                className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)] hover:underline"
              >
                {t('detail.viewAllArcs')}
              </NavLink>
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
                {hasHiddenActiveMemories ? (
                  <span
                    id="active-memories-preview-count"
                    className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-3)]"
                  >
                    {t('detail.activeMemoriesPreviewCount', {
                      shown: 3,
                      total: activeMemoryCount,
                    })}
                  </span>
                ) : null}
              </div>
              <NavLink
                href={`/campaigns/${campaign.id}/memory/review`}
                aria-describedby={
                  hasHiddenActiveMemories
                    ? 'active-memories-preview-count'
                    : undefined
                }
                className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)] hover:underline"
              >
                {t('detail.viewAllMemories')}
              </NavLink>
            </div>
          </div>
          <ActiveMemoriesPanel
            isLoading={
              memoriesQuery.isPending ||
              (memoriesQuery.data === undefined && !memoriesQuery.isError)
            }
            isError={memoriesQuery.isError}
            memories={(memoriesQuery.data ?? []).slice(0, 3)}
            retryLabel={t('screen.retry')}
            onRetry={() => memoriesQuery.refetch()}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Renders live active memories without fabricating placeholder chronicle entries.
 *
 * @param {object} root0 - The active memories panel props.
 * @param {boolean} root0.isLoading - Whether the facts query is loading.
 * @param {boolean} root0.isError - Whether the facts query errored.
 * @param {Awaited<ReturnType<typeof getMemoryFacts>>} root0.memories - Active memory facts to render.
 * @param {string} root0.retryLabel - Label for the retry control.
 * @param {() => void} root0.onRetry - Retry the facts query.
 * @returns {React.ReactElement} The active memories panel element.
 */
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
  const tm = useTranslations('MemoryReview')

  if (isLoading) {
    return (
      <div
        aria-busy="true"
        className="mt-3 min-h-[258px] border-2 border-[var(--border)] bg-[var(--paper)] px-4 shadow-[4px_4px_0_var(--shadow)]"
      >
        <p
          role="status"
          aria-label={t('detail.memoriesLoading')}
          className="sr-only"
        >
          {t('detail.memoriesLoading')}
        </p>
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            data-testid="active-memories-skeleton-record"
            className="flex min-h-[86px] flex-col justify-center gap-2 border-b border-dotted border-[var(--dotted)] py-3 last:border-b-0"
          >
            <span aria-hidden="true" className="h-3 w-16 bg-[var(--paper-2)]" />
            <span
              aria-hidden="true"
              className="h-3 w-full bg-[var(--paper-2)]"
            />
            <span
              aria-hidden="true"
              className="h-3 w-4/5 bg-[var(--paper-2)]"
            />
            <span aria-hidden="true" className="h-3 w-24 bg-[var(--paper-2)]" />
          </div>
        ))}
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
    <div className="ll-panel-settle mt-3 border-2 border-[var(--border)] bg-[var(--paper)] px-4 shadow-[4px_4px_0_var(--shadow)]">
      {memories.map((memory) => (
        <div
          key={memory.id}
          className="border-b border-dotted border-[var(--dotted)] py-3 last:border-b-0"
        >
          {memory.type ? (
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
              {(() => {
                const key = getMemoryTypeMessageKey(memory.type)
                return key
                  ? tm(`memoryType.${key}`)
                  : tm('memoryTypeUnknown', {
                      type: humanizeMemoryType(memory.type),
                    })
              })()}
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
