/* eslint-disable jsdoc/require-param, jsdoc/require-returns */
'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Link, useRouter } from '@/i18n/navigation'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingScribe } from '@/components/ui/loading-scribe'
import { Notice } from '@/components/ui/notice'
import { OriginBadge } from '@/components/ui/origin-badge'
import { Textarea } from '@/components/ui/textarea'
import { getCampaignDetail, CampaignNotFoundError } from '@/lib/campaigns/api'
import {
  createMemoryFact,
  getMemoryFacts,
  updateMemoryFact,
} from '@/lib/memory/api'
import type { MemoryFactResponse } from '@/lib/memory/schemas'
import {
  completeMemoryReviewDraft,
  readMemoryReviewDraft,
  type MemoryReviewDraft,
} from '@/lib/sessions/memory-review-draft'
import type { MemorySuggestion } from '@/lib/sessions/schemas'
import { cn } from '@/lib/utils'

type PendingSuggestion = MemorySuggestion & {
  id: string
}

type Feedback = 'accepted' | 'edited' | 'dismissed' | 'retired' | null

/** Creates a stable client-only key for transient suggestions that have no persisted ID. */
function suggestionId(suggestion: MemorySuggestion, index: number) {
  return `${suggestion.type}:${suggestion.content}:${index}`
}

/** Converts a validated draft into renderable pending suggestions without persisting them. */
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

/** Runs the DM-only review screen where suggestions become facts only after confirmation. */
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
  const [draft] = useState<MemoryReviewDraft | null>(() =>
    sessionId ? readMemoryReviewDraft(campaignId, sessionId) : null
  )
  const [pending, setPending] = useState<PendingSuggestion[]>(() =>
    readPendingSuggestions(draft)
  )
  const [editing, setEditing] = useState<string | null>(null)
  const [fx, setFx] = useState<Record<string, 'stamping' | 'discarding'>>({})
  const [feedback, setFeedback] = useState<Feedback>(null)

  const campaignQuery = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => getCampaignDetail(campaignId),
  })
  const memoriesQuery = useQuery({
    queryKey: ['campaign', campaignId, 'memory-facts', 'active'],
    queryFn: () => getMemoryFacts(campaignId, { status: 'active' }),
  })

  useEffect(() => {
    if (sessionId && pending.length === 0) {
      completeMemoryReviewDraft(campaignId, sessionId)
    }
  }, [campaignId, pending.length, sessionId])

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
    onSuccess: (_fact, variables) => {
      setEditing(null)
      setFeedback(
        variables.content === variables.suggestion.content
          ? 'accepted'
          : 'edited'
      )
      setFx((current) => ({
        ...current,
        [variables.suggestion.id]: 'stamping',
      }))
      window.setTimeout(() => {
        setPending((items) =>
          items.filter((item) => item.id !== variables.suggestion.id)
        )
        setFx((current) => {
          const next = { ...current }
          delete next[variables.suggestion.id]
          return next
        })
        void queryClient.invalidateQueries({
          queryKey: ['campaign', campaignId, 'memory-facts', 'active'],
        })
      }, 120)
    },
  })

  const retireMutation = useMutation({
    mutationFn: (memoryId: string) =>
      updateMemoryFact(memoryId, { status: 'archived' }),
    onSuccess: () => {
      setFeedback('retired')
      void queryClient.invalidateQueries({
        queryKey: ['campaign', campaignId, 'memory-facts', 'active'],
      })
    },
  })

  /** Removes a proposal locally so dismissed Scribe output never reaches the API. */
  function dismissSuggestion(suggestion: PendingSuggestion) {
    setFx((current) => ({ ...current, [suggestion.id]: 'discarding' }))
    window.setTimeout(() => {
      setPending((items) => items.filter((item) => item.id !== suggestion.id))
      setFx((current) => {
        const next = { ...current }
        delete next[suggestion.id]
        return next
      })
      setFeedback('dismissed')
    }, 120)
  }

  if (campaignQuery.isLoading) {
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
  const sessionDisplay = draft?.session_number
    ? String(draft.session_number)
    : t('sessionUnknown')
  const sourceLabelFor = (sourceSessionId?: string | null) => {
    if (!sourceSessionId) return t('manualSource')
    if (draft?.session_id === sourceSessionId) {
      return t('sessionLabel', { number: draft.session_number })
    }
    return t('sessionSource')
  }

  return (
    <main
      id="main-content"
      className="ll-view-enter mx-auto max-w-[900px] px-6 py-16"
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

      {feedback ? (
        <Notice className="mt-5" variant="plain" role="status">
          {t(`feedback.${feedback}`)}
        </Notice>
      ) : null}

      <section className="mt-6 grid gap-4" aria-label={t('pendingSection')}>
        {pending.length === 0 ? (
          <EmptyState
            className="border-dashed bg-transparent shadow-none"
            title={t('emptyPendingTitle')}
            description={t('emptyPendingDescription')}
            action={
              <Button
                type="button"
                onClick={() => router.push(`/campaigns/${campaignId}`)}
              >
                {t('backToCampaign')}
              </Button>
            }
          />
        ) : (
          pending.map((suggestion) =>
            editing === suggestion.id ? (
              <SuggestionEditor
                key={suggestion.id}
                suggestion={suggestion}
                isBusy={createMutation.isPending}
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
                isBusy={createMutation.isPending || Boolean(fx[suggestion.id])}
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

      <hr className="my-8 border-t border-[var(--line)]" />

      <section aria-label={t('activeSection')}>
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

/** Keeps retry actions visually quiet while preserving an accessible button. */
function RetryButton({
  label,
  onRetry,
}: {
  label: string
  onRetry: () => void
}) {
  return (
    <button
      type="button"
      className="mt-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] underline"
      onClick={onRetry}
    >
      {label}
    </button>
  )
}

/** Renders a single Scribe proposal with accept, edit, and dismiss affordances. */
function SuggestionCard({
  suggestion,
  fx,
  isBusy,
  onAccept,
  onEdit,
  onDismiss,
}: {
  suggestion: PendingSuggestion
  fx?: 'stamping' | 'discarding'
  isBusy: boolean
  onAccept: () => void
  onEdit: () => void
  onDismiss: () => void
}) {
  const t = useTranslations('MemoryReview')
  const stamping = fx === 'stamping'
  const discarding = fx === 'discarding'

  return (
    <article
      className={cn(
        'relative overflow-hidden border-2 border-[var(--border)] bg-[var(--paper)] shadow-[6px_6px_0_var(--shadow)]',
        discarding && 'll-discarding'
      )}
    >
      {stamping ? <span className="ll-stamp">{t('acceptedStamp')}</span> : null}
      <div className="flex items-baseline gap-3 px-5 pt-4">
        <p className="font-serif text-[15px] italic text-[var(--accent-deep)]">
          {t('scribeProposes')}
        </p>
        <OriginBadge origin="scribe" className="ml-auto" />
      </div>
      <hr className="mx-5 mt-3 border-t border-dashed border-[var(--dotted)]" />
      <div className="px-5 py-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="border border-[var(--accent)] bg-[var(--accent-wash)] px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--accent-deep)]">
            {suggestion.type}
          </span>
          <span className="border border-[var(--dotted)] px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
            {t('importance', { importance: suggestion.importance })}
          </span>
        </div>
        <blockquote
          className={cn(
            'serif text-[17px] leading-relaxed text-[var(--ink)]',
            discarding && 'll-strike'
          )}
        >
          “{suggestion.content}”
        </blockquote>
        <p className="mt-3 border-l-[3px] border-[var(--accent)] pl-3 text-sm text-[var(--ink-2)]">
          {suggestion.reason}
        </p>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.03em] text-[var(--ink-2)]">
          <b className="text-[var(--ink)]">{t('touches')}</b>{' '}
          {suggestion.related.length > 0
            ? suggestion.related.join(' · ')
            : t('none')}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t-2 border-[var(--border)] px-5 py-3">
        <Button type="button" onClick={onAccept} disabled={isBusy}>
          {t('accept')}
        </Button>
        <Button type="button" onClick={onEdit} disabled={isBusy}>
          {t('editAccept')}
        </Button>
        <button
          type="button"
          className="ml-auto font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-2)] underline disabled:opacity-50"
          onClick={onDismiss}
          disabled={isBusy}
        >
          {t('dismiss')}
        </button>
      </div>
    </article>
  )
}

/** Lets the DM change suggested text before accepting it as canonical memory. */
function SuggestionEditor({
  suggestion,
  isBusy,
  onSave,
  onCancel,
}: {
  suggestion: PendingSuggestion
  isBusy: boolean
  onSave: (content: string) => void
  onCancel: () => void
}) {
  const t = useTranslations('MemoryReview')
  const [text, setText] = useState(suggestion.content)

  return (
    <article className="border-2 border-[var(--accent)] bg-[var(--paper)] shadow-[6px_6px_0_var(--accent)]">
      <div className="px-5 py-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="border border-[var(--accent)] bg-[var(--accent-wash)] px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--accent-deep)]">
            {suggestion.type}
          </span>
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
            {t('editing')}
          </span>
        </div>
        <Textarea
          aria-label={t('memoryText')}
          rows={4}
          value={text}
          onChange={(event) => setText(event.target.value)}
          autoFocus
        />
      </div>
      <div className="flex flex-wrap gap-2 border-t-2 border-[var(--border)] px-5 py-3">
        <Button
          type="button"
          onClick={() => onSave(text)}
          disabled={isBusy || !text.trim()}
        >
          {t('saveAccept')}
        </Button>
        <Button type="button" onClick={onCancel} disabled={isBusy}>
          {t('cancel')}
        </Button>
      </div>
    </article>
  )
}

/** Shows the active facts that will feed future session preparation. */
function ActiveMemories({
  memories,
  isLoading,
  isError,
  isBusy,
  retryLabel,
  sourceLabelFor,
  onRetry,
  onRetire,
}: {
  memories: MemoryFactResponse[]
  isLoading: boolean
  isError: boolean
  isBusy: boolean
  retryLabel: string
  sourceLabelFor: (sourceSessionId?: string | null) => string
  onRetry: () => void
  onRetire: (memory: MemoryFactResponse) => void
}) {
  const t = useTranslations('MemoryReview')

  if (isLoading) {
    return (
      <LoadingScribe
        title={t('activeLoadingTitle')}
        caption={t('activeLoadingCaption')}
      />
    )
  }

  if (isError) {
    return (
      <Notice className="my-5" variant="error" role="alert">
        <p>{t('activeError')}</p>
        <RetryButton label={retryLabel} onRetry={onRetry} />
      </Notice>
    )
  }

  if (memories.length === 0) {
    return (
      <EmptyState
        className="border-0 shadow-none"
        ornament="✦"
        title={t('emptyActiveTitle')}
        description={t('emptyActiveDescription')}
      />
    )
  }

  return (
    <div>
      {memories.map((memory) => (
        <div
          key={memory.id}
          className="flex items-start gap-4 border-b border-dotted border-[var(--dotted)] py-4 last:border-b-0"
        >
          <div className="min-w-0">
            {memory.type ? (
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
                {memory.type}
              </span>
            ) : null}
            <p className="mt-1 font-serif text-[14.5px] leading-relaxed text-[var(--ink)]">
              {memory.content}
            </p>
            <p className="mt-1 text-xs text-[var(--ink-3)]">
              {t('acceptedMeta', {
                source: sourceLabelFor(memory.source_session_id),
              })}
            </p>
          </div>
          <button
            type="button"
            className="ml-auto whitespace-nowrap font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-2)] underline disabled:opacity-50"
            onClick={() => onRetire(memory)}
            disabled={isBusy}
          >
            {t('retire')}
          </button>
        </div>
      ))}
    </div>
  )
}
