'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Notice } from '@/components/ui/notice'
import { DemoBreadcrumb } from '@/components/demo/demo-breadcrumb'
import { DemoTour, type DemoTourStep } from '@/components/demo/demo-tour'
import {
  ActiveMemories,
  SuggestionCard,
  SuggestionEditor,
  type Feedback,
  type PendingSuggestion,
  type SuggestionFx,
} from '@/components/sessions/memory-review-parts'
import { demoHrefs } from '@/lib/demo/hrefs'
import { useDemoStore } from '@/lib/demo/store'
import { CARD_EXIT_MS, STAMP_LIFETIME_MS } from '@/lib/motion/timings'

/**
 * `/demo/memory` — the memory review screen. Reuses the exact production
 * suggestion and active-memory components; accept/dismiss/retire all run
 * against the in-memory demo store. Suggestions appear only after the DM logs
 * the sample session on `/demo/sessions/new`.
 *
 * @returns {React.ReactElement} The demo memory review page element.
 */
export default function DemoMemoryReviewPage() {
  const t = useTranslations('MemoryReview')
  const te = useTranslations('Entities')
  const tt = useTranslations('Demo.tour')
  const store = useDemoStore()

  const tourSteps: DemoTourStep[] = [
    {
      element: '[data-tour="suggestions"]',
      title: tt('memorySuggestionsTitle'),
      description: tt('memorySuggestionsBody'),
    },
  ]

  // Seeded once from the store's pre-keyed suggestions; local `pending` then
  // drives the accept/dismiss exit animation without re-keying (the store's
  // ids are the source of truth `resolveSuggestion` filters against).
  // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once on mount only
  const initialPending = useMemo(() => store.suggestions, [])

  const [pending, setPending] = useState<PendingSuggestion[]>(initialPending)
  const [editing, setEditing] = useState<string | null>(null)
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [isRetiring, setIsRetiring] = useState(false)
  const [fx, setFx] = useState<Record<string, SuggestionFx>>({})
  const [feedback, setFeedback] = useState<Feedback>(null)

  const activeMemories = store.memoryFacts.filter(
    (fact) => fact.status === 'active'
  )
  const sessionDisplay = store.loggedSession
    ? String(store.loggedSession.sessionNumber)
    : t('sessionUnknown')

  /**
   * Remove a processed suggestion from the pending list.
   *
   * @param {string} id - The render key of the suggestion to drop.
   */
  function removePending(id: string) {
    setPending((items) => items.filter((item) => item.id !== id))
  }

  /**
   * Clear a card's transient feedback phase once it has left the screen.
   *
   * @param {string} id - The render key to clear.
   */
  function clearFx(id: string) {
    setFx((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }

  /**
   * Accept a suggestion (optionally edited) as a canonical memory fact.
   *
   * @param {PendingSuggestion} suggestion - The suggestion being accepted.
   * @param {string} content - The final memory text.
   */
  async function accept(suggestion: PendingSuggestion, content: string) {
    setSubmittingId(suggestion.id)
    // Drop the suggestion synchronously, BEFORE awaiting the simulated latency:
    // `acceptSuggestion` stores the fact immediately but its promise settles
    // after a delay, so resolving only after the await would leave a window in
    // which a remount could resurrect the already-accepted suggestion and let
    // it be accepted twice.
    store.resolveSuggestion(suggestion.id)
    try {
      await store.acceptSuggestion({ suggestion, content })
      setEditing(null)
      setFeedback(content === suggestion.content ? 'accepted' : 'edited')
      setFx((current) => ({ ...current, [suggestion.id]: 'stamping' }))
      // Pop, hold the stamp readable, then file the card away. Timer-driven so
      // it behaves identically under every `data-motion` mode, where the stamp
      // is a static badge that fires no animation events.
      window.setTimeout(() => {
        setFx((current) =>
          current[suggestion.id] === 'stamping'
            ? { ...current, [suggestion.id]: 'accepting' }
            : current
        )
        window.setTimeout(() => {
          removePending(suggestion.id)
          clearFx(suggestion.id)
        }, CARD_EXIT_MS)
      }, STAMP_LIFETIME_MS)
    } finally {
      // Always re-enable the controls; the demo store never rejects, but a
      // rejection must never leave the card disabled forever.
      setSubmittingId(null)
    }
  }

  /**
   * Dismiss a suggestion so it never becomes a memory.
   *
   * @param {PendingSuggestion} suggestion - The suggestion being dismissed.
   */
  function dismiss(suggestion: PendingSuggestion) {
    store.resolveSuggestion(suggestion.id)
    setFx((current) => ({ ...current, [suggestion.id]: 'discarding' }))
    // The strike + slide must finish before the card is torn down.
    window.setTimeout(() => {
      removePending(suggestion.id)
      clearFx(suggestion.id)
      setFeedback('dismissed')
    }, CARD_EXIT_MS)
  }

  return (
    <main
      id="main-content"
      className="ll-view-enter ll-workspace mx-auto max-w-[900px] px-6 py-16"
    >
      <DemoTour tourKey="memory" steps={tourSteps} />

      <DemoBreadcrumb title={t('breadcrumb')} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
            {t('kicker', { session: sessionDisplay })}
          </p>
          <h1 className="mt-3 font-serif text-[38px] font-semibold leading-[1.04] tracking-[-0.03em] text-[var(--ink)]">
            {t('title')}
          </h1>
          <p className="mt-3 max-w-[620px] text-base leading-relaxed text-[var(--ink-2)]">
            {pending.length > 0
              ? t('subtitleWithCount', { count: pending.length })
              : t('subtitleEmpty')}
          </p>
        </div>
      </div>

      {pending.length > 0 ? (
        <Notice className="mt-5" variant="scribe" role="status">
          {t('notPersistedNotice')}
        </Notice>
      ) : null}

      {feedback ? (
        <Notice className="mt-5" variant="plain" role="status">
          {t(`feedback.${feedback}`)}
        </Notice>
      ) : null}

      <div className="ll-memory-review-lanes mt-6">
        <section
          className="grid gap-4"
          aria-label={t('pendingSection')}
          data-tour="suggestions"
        >
          {pending.length === 0 ? (
            <EmptyState
              className="border-dashed bg-transparent shadow-none"
              title={t('emptyPendingTitle')}
              description={t('emptyPendingDescription')}
              action={
                <Button asChild type="button">
                  <Link href={demoHrefs.campaign}>{t('backToCampaign')}</Link>
                </Button>
              }
            />
          ) : (
            pending.map((suggestion) =>
              editing === suggestion.id ? (
                <SuggestionEditor
                  key={suggestion.id}
                  suggestion={suggestion}
                  isBusy={submittingId === suggestion.id}
                  onCancel={() => setEditing(null)}
                  onSave={(content) => void accept(suggestion, content)}
                />
              ) : (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  fx={fx[suggestion.id]}
                  isSubmitting={submittingId === suggestion.id}
                  onAccept={() => void accept(suggestion, suggestion.content)}
                  onEdit={() => setEditing(suggestion.id)}
                  onDismiss={() => dismiss(suggestion)}
                />
              )
            )
          )}
        </section>

        <section
          className="ll-memory-review-canon mt-7 border-t-2 border-[var(--line-strong)] pt-6"
          aria-label={t('activeSection')}
        >
          <div className="ll-rule-anim flex items-baseline justify-between gap-4">
            <h2 className="font-serif text-[19px] font-semibold text-[var(--ink)]">
              {t('activeTitle', { count: activeMemories.length })}
            </h2>
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--ink-3)]">
              {t('activeHelp')}
            </p>
          </div>

          <div className="mt-3 border-2 border-[var(--border)] bg-[var(--paper)] px-5 shadow-[6px_6px_0_var(--shadow)]">
            <ActiveMemories
              memories={activeMemories}
              isLoading={false}
              isError={false}
              isBusy={isRetiring}
              retryLabel={te('retry')}
              sourceLabelFor={(sourceSessionId) =>
                sourceSessionId ? t('sessionSource') : t('manualSource')
              }
              onRetry={() => undefined}
              onRetire={(memory) => {
                setIsRetiring(true)
                void store
                  .retireMemory(memory.id)
                  .then(() => {
                    setFeedback('retired')
                  })
                  .finally(() => {
                    // Always re-enable the controls, even on rejection.
                    setIsRetiring(false)
                  })
              }}
            />
          </div>
        </section>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button asChild type="button">
          <Link href={demoHrefs.campaign}>{t('backToCampaign')}</Link>
        </Button>
        <Button asChild type="button" variant="accent">
          <Link href={demoHrefs.prepare}>{t('prepareNext')}</Link>
        </Button>
      </div>
    </main>
  )
}
