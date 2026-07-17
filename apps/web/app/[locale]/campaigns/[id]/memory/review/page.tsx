'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Link, useRouter } from '@/i18n/navigation'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingScribe } from '@/components/ui/loading-scribe'
import { Notice } from '@/components/ui/notice'
import {
  ActiveMemories,
  InlineScribeBusy,
  RetryButton,
  SuggestionCard,
  SuggestionEditor,
  type PendingSuggestion,
  type SuggestionFx,
} from '@/components/sessions/memory-review-parts'
import { CARD_EXIT_MS, STAMP_LIFETIME_MS } from '@/lib/motion/timings'
import { getCampaignDetail, CampaignNotFoundError } from '@/lib/campaigns/api'
import {
  createMemoryFact,
  getMemoryFacts,
  updateMemoryFact,
} from '@/lib/memory/api'
import {
  recoverMemorySuggestions,
  SessionCampaignNotFoundError,
  SessionNotPlayedError,
  SessionRateLimitError,
} from '@/lib/sessions/api'
import {
  completeMemoryReviewDraft,
  readMemoryReviewDraft,
  rewriteMemoryReviewDraftSuggestions,
  writeMemoryReviewDraft,
  type MemoryReviewDraft,
} from '@/lib/sessions/memory-review-draft'
import type { MemorySuggestion } from '@/lib/sessions/schemas'

type Feedback = 'accepted' | 'edited' | 'dismissed' | 'retired' | null
type ActionError = 'create' | 'retire' | null
type RecoverErrorKey = 'notFound' | 'rateLimit' | 'notPlayed' | 'generic'

/**
 * Maps a failed recovery attempt onto the copy that tells the DM what to do next.
 *
 * Every branch here is a FAILURE. A successful call that carries no proposals is
 * never routed through this function — the Scribe having nothing to say is an
 * answer, and rendering it as an error would be a lie.
 *
 * @param {unknown} error - The error thrown by the recovery request.
 * @returns {RecoverErrorKey} The message key describing the failure.
 */
function recoverErrorKey(error: unknown): RecoverErrorKey {
  if (error instanceof SessionCampaignNotFoundError) return 'notFound'
  if (error instanceof SessionRateLimitError) return 'rateLimit'
  if (error instanceof SessionNotPlayedError) return 'notPlayed'
  return 'generic'
}

/**
 * Creates a stable client-only key for transient suggestions that have no persisted ID.
 *
 * @param {MemorySuggestion} suggestion - The suggestion to identify.
 * @param {number} index - Position of the suggestion within the draft list.
 * @returns {string} A stable composite key.
 */
function suggestionId(suggestion: MemorySuggestion, index: number) {
  return `${suggestion.type}:${suggestion.content}:${index}`
}

/**
 * Converts a validated draft into renderable pending suggestions without persisting them.
 *
 * @param {MemoryReviewDraft | null} draft - The stored review draft, if any.
 * @returns {PendingSuggestion[]} Pending suggestions keyed for render-only state.
 */
function readPendingSuggestions(
  draft: MemoryReviewDraft | null
): PendingSuggestion[] {
  return draft
    ? draft.memory_suggestions.map((suggestion, index) => ({
        ...suggestion,
        id: suggestionId(suggestion, index),
      }))
    : []
}

/**
 * Removes the render-only key before rewriting the transient storage draft.
 *
 * @param {PendingSuggestion} suggestion - The pending suggestion to strip.
 * @returns {MemorySuggestion} The suggestion without its transient id.
 */
function toMemorySuggestion(suggestion: PendingSuggestion): MemorySuggestion {
  return {
    content: suggestion.content,
    type: suggestion.type,
    importance: suggestion.importance,
    reason: suggestion.reason,
    related: suggestion.related,
  }
}

/**
 * Runs the DM-only review screen where suggestions become facts only after confirmation.
 *
 * @returns {React.ReactElement} The memory review page element.
 */
export default function MemoryReviewPage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const campaignId = params.id
  const sessionId = searchParams.get('session') ?? ''
  const router = useRouter()
  const queryClient = useQueryClient()
  const t = useTranslations('MemoryReview')
  const tc = useTranslations('Campaigns')
  const te = useTranslations('Entities')
  const [draft, setDraft] = useState<MemoryReviewDraft | null>(null)
  const [pending, setPending] = useState<PendingSuggestion[]>([])
  const [isDraftLoaded, setIsDraftLoaded] = useState(false)
  const [loadedDraftKey, setLoadedDraftKey] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [fx, setFx] = useState<Record<string, SuggestionFx>>({})
  // Accepts are per-card, so several can be in flight at once. A single slot
  // would let a later accept clear an earlier card's busy state and re-enable
  // its Accept button mid-request, stamping the same suggestion twice.
  const [submittingIds, setSubmittingIds] = useState<Record<string, true>>({})
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [actionError, setActionError] = useState<ActionError>(null)

  const campaignQuery = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => getCampaignDetail(campaignId),
  })
  const memoriesQuery = useQuery({
    queryKey: ['campaign', campaignId, 'memory-facts', 'active'],
    queryFn: () => getMemoryFacts(campaignId, { status: 'active' }),
  })

  useEffect(() => {
    let isCurrent = true
    const draftKey = sessionId ? `${campaignId}:${sessionId}` : null

    const loadDraft = () => {
      if (!isCurrent) return

      if (!sessionId) {
        setDraft(null)
        setPending([])
        setIsDraftLoaded(true)
        setLoadedDraftKey(null)
        return
      }

      const nextDraft = readMemoryReviewDraft(campaignId, sessionId)
      setDraft(nextDraft)
      setPending(readPendingSuggestions(nextDraft))
      setIsDraftLoaded(true)
      setLoadedDraftKey(draftKey)
    }

    const timer = window.setTimeout(loadDraft, 0)

    return () => {
      isCurrent = false
      window.clearTimeout(timer)
    }
  }, [campaignId, sessionId])

  useEffect(() => {
    if (!sessionId) {
      return
    }

    const draftKey = `${campaignId}:${sessionId}`
    if (isDraftLoaded && loadedDraftKey === draftKey && pending.length === 0) {
      completeMemoryReviewDraft(campaignId, sessionId)
    }
  }, [campaignId, isDraftLoaded, loadedDraftKey, pending.length, sessionId])

  const pendingRef = useRef<PendingSuggestion[]>([])
  useEffect(() => {
    pendingRef.current = pending
  }, [pending])

  /**
   * Removes a processed suggestion from UI state and the scoped transient draft.
   *
   * The draft rewrite deliberately runs OUTSIDE the `setPending` updater. A card
   * is removed on a timer once its stamp has been read, and if the DM leaves
   * during that window React drops the updater for the unmounted component — so
   * a rewrite living inside it would silently never happen, resurrecting an
   * already-accepted suggestion on the next visit.
   *
   * @param {string} suggestionIdToRemove - The render-only id of the suggestion to remove.
   * @returns {void}
   */
  function removePendingSuggestion(suggestionIdToRemove: string) {
    const remaining = pendingRef.current.filter(
      (item) => item.id !== suggestionIdToRemove
    )
    pendingRef.current = remaining
    if (sessionId) {
      rewriteMemoryReviewDraftSuggestions(
        campaignId,
        sessionId,
        remaining.map(toMemorySuggestion)
      )
    }
    setPending(remaining)
  }

  /**
   * Releases only this card's in-flight slot, leaving concurrent accepts busy.
   *
   * @param {string} suggestionIdToClear - The render-only id to release.
   * @returns {void}
   */
  function clearSubmitting(suggestionIdToClear: string) {
    setSubmittingIds((current) => {
      const next = { ...current }
      delete next[suggestionIdToClear]
      return next
    })
  }

  /**
   * Clears a card's transient feedback phase once it has left the screen.
   *
   * @param {string} suggestionIdToClear - The render-only id to clear.
   * @returns {void}
   */
  function clearFx(suggestionIdToClear: string) {
    setFx((current) => {
      const next = { ...current }
      delete next[suggestionIdToClear]
      return next
    })
  }

  const createMutation = useMutation({
    mutationFn: ({
      suggestion,
      content,
    }: {
      suggestion: PendingSuggestion
      content: string
    }) =>
      createMemoryFact(campaignId, {
        source_session_id: sessionId || undefined,
        content,
        type: suggestion.type,
        importance: suggestion.importance,
      }),
    onMutate: (variables) => {
      setSubmittingIds((current) => ({
        ...current,
        [variables.suggestion.id]: true,
      }))
    },
    onSuccess: (_fact, variables) => {
      setEditing(null)
      setActionError(null)
      clearSubmitting(variables.suggestion.id)
      setFeedback(
        variables.content === variables.suggestion.content
          ? 'accepted'
          : 'edited'
      )
      setFx((current) => ({
        ...current,
        [variables.suggestion.id]: 'stamping',
      }))
      void queryClient.invalidateQueries({
        queryKey: ['campaign', campaignId, 'memory-facts', 'active'],
      })

      // Pop, then hold the stamp readable, then file the card away. Both delays
      // are timer-driven on purpose: under subtle/off/reduced motion the stamp
      // is a static badge, so an `animationend` listener would never fire and
      // the card would never leave.
      window.setTimeout(() => {
        setFx((current) =>
          current[variables.suggestion.id] === 'stamping'
            ? { ...current, [variables.suggestion.id]: 'accepting' }
            : current
        )
        window.setTimeout(() => {
          removePendingSuggestion(variables.suggestion.id)
          clearFx(variables.suggestion.id)
        }, CARD_EXIT_MS)
      }, STAMP_LIFETIME_MS)
    },
    onError: (_error, variables) => {
      clearSubmitting(variables.suggestion.id)
      setActionError('create')
    },
  })

  const retireMutation = useMutation({
    mutationFn: (memoryId: string) =>
      updateMemoryFact(memoryId, { status: 'archived' }),
    onSuccess: () => {
      setActionError(null)
      setFeedback('retired')
      void queryClient.invalidateQueries({
        queryKey: ['campaign', campaignId, 'memory-facts', 'active'],
      })
    },
    onError: () => {
      setActionError('retire')
    },
  })

  const activeDraftKey = sessionId ? `${campaignId}:${sessionId}` : null

  // Recovery seeds the pending lane, so the draft write and `setPending` must
  // land in the SAME commit. Splitting them across an effect would leave one
  // render with a seeded draft and an empty lane — exactly the shape the
  // draft-completing effect above deletes.
  const recoverMutation = useMutation({
    mutationFn: () => recoverMemorySuggestions(sessionId),
    // `?session=` can change while the request is in flight. Pin the session
    // the DM actually asked about so a late reply can be matched against the
    // route that is live when it lands.
    onMutate: () => ({ requestedDraftKey: activeDraftKey }),
    onSuccess: (data, _variables, context) => {
      // A stale reply belongs to a session the DM has already left. Seeding it
      // here would show one session's proposals under another and let them be
      // accepted with the wrong `source_session_id`.
      if (context.requestedDraftKey !== activeDraftKey) return
      if (data.memory_suggestions.length === 0) return

      const recovered = data.memory_suggestions.map((suggestion, index) => ({
        ...suggestion,
        id: suggestionId(suggestion, index),
      }))
      try {
        writeMemoryReviewDraft({
          campaign_id: campaignId,
          session_id: sessionId,
          // Recovery re-reads a session by id and never learns its number.
          session_number: draft?.session_number ?? null,
          memory_suggestions: data.memory_suggestions,
        })
      } catch {
        // Draft storage is best effort (same contract as registration). The
        // proposals were recovered successfully, so they must still reach the
        // lane — rendering a successful recovery as a failure would be a lie.
        // Only the write is guarded: the payload is already schema-validated
        // by the API client, so this catch cannot mask a contract bug.
      }
      pendingRef.current = recovered
      setPending(recovered)
    },
  })

  // The mutation object outlives a `?session=` switch, and the empty/error
  // notices below read its state declaratively — so without this reset,
  // session A's failure (or its "proposed nothing" answer) would render under
  // session B. Resetting does NOT cancel the in-flight request; the key guard
  // in `onSuccess` is what protects the seeding itself.
  const { reset: resetRecovery } = recoverMutation
  useEffect(() => {
    resetRecovery()
  }, [campaignId, sessionId, resetRecovery])

  /**
   * Removes a proposal locally so dismissed Scribe output never reaches the API.
   *
   * @param {PendingSuggestion} suggestion - The suggestion being dismissed.
   * @returns {void}
   */
  function dismissSuggestion(suggestion: PendingSuggestion) {
    setFx((current) => ({ ...current, [suggestion.id]: 'discarding' }))
    // The strike + slide must finish before the card is torn down.
    window.setTimeout(() => {
      removePendingSuggestion(suggestion.id)
      clearFx(suggestion.id)
      setActionError(null)
      setFeedback('dismissed')
    }, CARD_EXIT_MS)
  }

  // The draft read is deferred to an effect (never a state initializer, which
  // would break hydration), so the first paint has no draft yet. Gate it on the
  // read itself — NOT on `campaignQuery`, whose key is already warm from the
  // log-session screen and therefore masks nothing.
  if (campaignQuery.isLoading || !isDraftLoaded) {
    return (
      <main id="main-content" className="mx-auto max-w-[900px] px-6 py-16">
        <LoadingScribe
          title={t('loadingTitle')}
          caption={t('loadingCaption')}
        />
      </main>
    )
  }

  if (campaignQuery.error) {
    const isNotFound = campaignQuery.error instanceof CampaignNotFoundError
    return (
      <main id="main-content" className="mx-auto max-w-[900px] px-6 py-16">
        <Notice variant="error" role="alert">
          <p>{isNotFound ? tc('screen.notFound') : tc('screen.loadError')}</p>
          <RetryButton
            label={tc('screen.retry')}
            onRetry={() => campaignQuery.refetch()}
          />
        </Notice>
      </main>
    )
  }

  const campaign = campaignQuery.data
  if (!campaign) return null
  // Without `?session=` there is no session to re-read, so no action is offered.
  // An unplayed session can never become recoverable by asking again, so the
  // trigger is withdrawn rather than left inviting a retry that cannot work.
  const recoverIsFutile =
    recoverMutation.isError &&
    recoverErrorKey(recoverMutation.error) === 'notPlayed'
  const canRecover = Boolean(sessionId) && !recoverIsFutile
  // A 200 carrying no proposals: the Scribe was asked and had nothing to say.
  // Distinct from `isError` on purpose — this is a success and must never read
  // as a failure.
  const recoveredNothing =
    recoverMutation.isSuccess &&
    recoverMutation.data.memory_suggestions.length === 0
  const sessionDisplay = draft?.session_number
    ? String(draft.session_number)
    : t('sessionUnknown')
  const sourceLabelFor = (sourceSessionId?: string | null) => {
    if (!sourceSessionId) return t('manualSource')
    // A recovery-seeded draft has no session number; fall through to the
    // generic label rather than rendering "Session null".
    if (
      draft?.session_id === sourceSessionId &&
      draft.session_number !== null
    ) {
      return t('sessionLabel', { number: draft.session_number })
    }
    return t('sessionSource')
  }

  return (
    <main
      id="main-content"
      className="ll-view-enter ll-workspace mx-auto max-w-[900px] px-6 py-16"
    >
      <nav className="mb-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]">
        <Link href="/dashboard" className="hover:text-[var(--ink)]">
          {tc('breadcrumbRoot')}
        </Link>{' '}
        /{' '}
        <Link
          href={`/campaigns/${campaign.id}`}
          className="hover:text-[var(--ink)]"
        >
          {campaign.title}
        </Link>{' '}
        / <b className="text-[var(--ink)]">{t('breadcrumb')}</b>
      </nav>

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

      {actionError ? (
        <Notice className="mt-5" variant="error" ornament="⚠" role="alert">
          {t(`actionError.${actionError}`)}
        </Notice>
      ) : null}

      <div className="ll-memory-review-lanes mt-6">
        <section className="grid gap-4" aria-label={t('pendingSection')}>
          {pending.length === 0 ? (
            <EmptyState
              className="border-dashed bg-transparent shadow-none"
              title={t('emptyPendingTitle')}
              description={
                canRecover
                  ? t('recover.eligibleDescription')
                  : t('emptyPendingDescription')
              }
              action={
                <div className="flex w-full flex-col items-center gap-4">
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Button
                      type="button"
                      onClick={() => router.push(`/campaigns/${campaignId}`)}
                    >
                      {t('backToCampaign')}
                    </Button>
                    {canRecover ? (
                      <Button
                        type="button"
                        variant="accent"
                        disabled={recoverMutation.isPending}
                        onClick={() => recoverMutation.mutate()}
                      >
                        {t('recover.action')}
                      </Button>
                    ) : null}
                  </div>

                  {recoverMutation.isPending ? (
                    <InlineScribeBusy label={t('recover.loadingCaption')} />
                  ) : null}

                  {recoveredNothing ? (
                    <Notice
                      className="max-w-[52ch] text-left"
                      variant="plain"
                      role="status"
                    >
                      {t('recover.emptyResult')}
                    </Notice>
                  ) : null}

                  {recoverMutation.isError ? (
                    <Notice
                      className="max-w-[52ch] text-left"
                      variant="error"
                      ornament="⚠"
                      role="alert"
                    >
                      {t(
                        `recover.error.${recoverErrorKey(recoverMutation.error)}`
                      )}
                    </Notice>
                  ) : null}
                </div>
              }
            />
          ) : (
            pending.map((suggestion) =>
              editing === suggestion.id ? (
                <SuggestionEditor
                  key={suggestion.id}
                  suggestion={suggestion}
                  isBusy={submittingIds[suggestion.id] === true}
                  onCancel={() => setEditing(null)}
                  onSave={(content) =>
                    createMutation.mutate({ suggestion, content })
                  }
                />
              ) : (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  fx={fx[suggestion.id]}
                  isSubmitting={submittingIds[suggestion.id] === true}
                  onAccept={() =>
                    createMutation.mutate({
                      suggestion,
                      content: suggestion.content,
                    })
                  }
                  onEdit={() => setEditing(suggestion.id)}
                  onDismiss={() => dismissSuggestion(suggestion)}
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
              {t('activeTitle', { count: memoriesQuery.data?.length ?? 0 })}
            </h2>
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--ink-3)]">
              {t('activeHelp')}
            </p>
          </div>

          <div className="mt-3 border-2 border-[var(--border)] bg-[var(--paper)] px-5 shadow-[6px_6px_0_var(--shadow)]">
            <ActiveMemories
              memories={memoriesQuery.data ?? []}
              isLoading={memoriesQuery.isLoading}
              isError={memoriesQuery.isError}
              isBusy={retireMutation.isPending}
              retryLabel={te('retry')}
              sourceLabelFor={sourceLabelFor}
              onRetry={() => memoriesQuery.refetch()}
              onRetire={(memory) => retireMutation.mutate(memory.id)}
            />
          </div>
        </section>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button
          type="button"
          onClick={() => router.push(`/campaigns/${campaignId}`)}
        >
          {t('backToCampaign')}
        </Button>
        <Button
          type="button"
          variant="accent"
          onClick={() => router.push(`/campaigns/${campaignId}/prepare`)}
        >
          {t('prepareNext')}
        </Button>
      </div>
    </main>
  )
}
