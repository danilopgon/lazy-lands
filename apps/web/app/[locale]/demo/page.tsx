'use client'

import { useTranslations } from 'next-intl'

import { NavLink, PENDING_SLOT_OVERLAY } from '@/components/navigation/nav-link'
import { WorldStateEditor } from '@/components/campaigns/world-state-editor'
import { DemoTour, type DemoTourStep } from '@/components/demo/demo-tour'
import { useAppLocale } from '@/i18n/use-app-locale'
import { formatShortDate } from '@/lib/format'
import { demoHrefs } from '@/lib/demo/hrefs'
import { useDemoStore } from '@/lib/demo/store'
import {
  getMemoryTypeMessageKey,
  humanizeMemoryType,
} from '@/lib/sessions/memory-type-label'

/**
 * `/demo` — the demo campaign detail, mirroring the authenticated campaign view
 * but wired entirely to the in-memory demo store. Every stat, link, and action
 * stays inside the demo island; the world-state editor persists locally through
 * the store's `saveWorldState` adapter.
 *
 * @returns {React.ReactElement} The demo campaign detail element.
 */
export default function DemoCampaignPage() {
  const t = useTranslations('Campaigns')
  const te = useTranslations('Entities')
  const tm = useTranslations('MemoryReview')
  const td = useTranslations('Demo')
  const tt = useTranslations('Demo.tour')
  const locale = useAppLocale()
  const store = useDemoStore()
  const { campaign, sessions, memoryFacts } = store

  const tourSteps: DemoTourStep[] = [
    { title: tt('welcomeTitle'), description: tt('welcomeBody') },
    {
      element: '[data-tour="world-state"]',
      title: tt('worldStateTitle'),
      description: tt('worldStateBody'),
    },
    {
      element: '[data-tour="stats"]',
      title: tt('statsTitle'),
      description: tt('statsBody'),
    },
    {
      element: '[data-tour="memory"]',
      title: tt('memoryTitle'),
      description: tt('memoryBody'),
    },
    {
      element: '[data-tour="prepare"]',
      title: tt('prepareTitle'),
      description: tt('prepareBody'),
    },
    { title: tt('outroTitle'), description: tt('outroBody') },
  ]

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
  const activeMemories = memoryFacts.filter((fact) => fact.status === 'active')
  const recentSessions = [...sessions]
    .sort((a, b) => b.session_number - a.session_number)
    .slice(0, 3)
    .sort((a, b) => a.session_number - b.session_number)

  /**
   * Resolve a memory type into a localized label or humanized fallback.
   *
   * @param {string | null | undefined} type - The raw memory type.
   * @returns {string} The localized label.
   */
  function memoryTypeLabel(type: string | null | undefined): string {
    const key = getMemoryTypeMessageKey(type)
    return key
      ? tm(`memoryType.${key}`)
      : tm('memoryTypeUnknown', { type: humanizeMemoryType(type) })
  }

  return (
    <main
      id="main-content"
      className="ll-view-enter ll-workspace mx-auto max-w-[1100px] px-6 py-16"
    >
      <DemoTour tourKey="campaign" steps={tourSteps} />

      <nav className="mb-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]">
        <span className="text-[var(--ink-3)]">{td('breadcrumbRoot')}</span> /{' '}
        <b className="text-[var(--ink)]">{campaign.title}</b>
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
        <div
          data-tour="actions"
          className="flex flex-wrap gap-2 sm:flex-nowrap sm:shrink-0"
        >
          <NavLink
            href={demoHrefs.logSession}
            pendingSlotClassName={PENDING_SLOT_OVERLAY}
            className="relative inline-flex h-11 items-center justify-center border-2 border-[var(--border)] bg-transparent px-5 py-2 font-sans text-sm font-semibold text-[var(--ink)] shadow-[3px_3px_0_var(--shadow)] transition-[transform,box-shadow,background] duration-100 ease-out hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:bg-[var(--paper-2)] hover:shadow-[1.5px_1.5px_0_var(--shadow)]"
          >
            {t('detail.logSessionHeader')}
          </NavLink>
          <NavLink
            href={demoHrefs.prepare}
            data-tour="prepare"
            pendingSlotClassName={PENDING_SLOT_OVERLAY}
            className="relative inline-flex h-11 items-center justify-center border-2 border-[var(--border)] bg-[var(--accent)] px-5 py-2 font-sans text-sm font-semibold text-[var(--bg-contrast)] shadow-[3px_3px_0_var(--shadow)] transition-[transform,box-shadow,background] duration-100 ease-out hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:shadow-[1.5px_1.5px_0_var(--shadow)]"
          >
            {t('detail.prepareNextHeader')}
          </NavLink>
        </div>
      </div>

      <div
        data-tour="stats"
        className="mt-6 grid border-2 border-[var(--border)] bg-[var(--paper)] shadow-[6px_6px_0_var(--shadow)] llg:grid-flow-col llg:auto-cols-fr"
      >
        <NavLink
          href={demoHrefs.npcs}
          pendingSlotClassName="absolute right-3 top-3"
          className="relative border-b-2 border-[var(--border)] p-4 last:border-b-0 llg:border-r-2 llg:border-b-0 llg:last:border-r-0 hover:bg-[var(--paper-2)] transition-colors"
        >
          <div className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--mute)]">
            {t('detail.statNpcs')}
          </div>
          <div className="mt-1 font-serif text-3xl font-semibold leading-none tracking-[-0.02em] text-[var(--ink)]">
            {campaign.npcs.length}
          </div>
        </NavLink>
        <NavLink
          href={demoHrefs.factions}
          pendingSlotClassName="absolute right-3 top-3"
          className="relative border-b-2 border-[var(--border)] p-4 last:border-b-0 llg:border-r-2 llg:border-b-0 llg:last:border-r-0 hover:bg-[var(--paper-2)] transition-colors"
        >
          <div className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--mute)]">
            {t('detail.statFactions')}
          </div>
          <div className="mt-1 font-serif text-3xl font-semibold leading-none tracking-[-0.02em] text-[var(--ink)]">
            {campaign.factions.length}
          </div>
        </NavLink>
        <NavLink
          href={demoHrefs.arcs}
          pendingSlotClassName="absolute right-3 top-3"
          className="relative border-b-2 border-[var(--border)] p-4 last:border-b-0 llg:border-r-2 llg:border-b-0 llg:last:border-r-0 hover:bg-[var(--paper-2)] transition-colors"
        >
          <div className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--mute)]">
            {t('detail.statArcs')}
          </div>
          <div className="mt-1 font-serif text-3xl font-semibold leading-none tracking-[-0.02em] text-[var(--ink)]">
            {campaign.arcs.length}
          </div>
        </NavLink>
        <NavLink
          href={demoHrefs.memory}
          pendingSlotClassName="absolute right-3 top-3"
          className="relative border-b-2 border-[var(--border)] p-4 last:border-b-0 hover:bg-[var(--paper-2)] transition-colors"
        >
          <div className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--mute)]">
            {t('detail.statMemory')}
          </div>
          <div className="mt-1 font-serif text-3xl font-semibold leading-none tracking-[-0.02em] text-[var(--ink)]">
            {activeMemories.length}
          </div>
        </NavLink>
      </div>

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
          <div className="mt-3" data-tour="world-state">
            <WorldStateEditor
              campaignId={campaign.id}
              initialValue={campaign.world_state}
              onSave={store.saveWorldState}
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
                href={demoHrefs.logSession}
                className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)] hover:underline"
              >
                {t('detail.logSession')}
              </NavLink>
            </div>
          </div>
          <div className="ll-panel-settle mt-3 space-y-3">
            {recentSessions.map((session) => (
              <div
                key={session.id}
                className="border-b border-dotted border-[var(--dotted)] pb-3 last:border-b-0"
              >
                <div className="font-serif text-[15px] font-semibold text-[var(--ink)]">
                  {td('sessionLabel', { number: session.session_number })}
                </div>
                {session.summary ? (
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[var(--ink-2)]">
                    {session.summary}
                  </p>
                ) : null}
              </div>
            ))}
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
                href={demoHrefs.arcs}
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
              </div>
              <NavLink
                href={demoHrefs.memory}
                data-tour="memory"
                className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)] hover:underline"
              >
                {t('detail.viewAllMemories')}
              </NavLink>
            </div>
          </div>
          <div className="ll-panel-settle mt-3 border-2 border-[var(--border)] bg-[var(--paper)] px-4 shadow-[4px_4px_0_var(--shadow)]">
            {activeMemories.slice(0, 3).map((memory) => (
              <div
                key={memory.id}
                className="border-b border-dotted border-[var(--dotted)] py-3 last:border-b-0"
              >
                {memory.type ? (
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
                    {memoryTypeLabel(memory.type)}
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
        </div>
      </div>
    </main>
  )
}
