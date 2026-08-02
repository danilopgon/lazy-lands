'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'motion/react'

import { DURATION, EASE } from '@/lib/motion/tokens'
import { useMotionMode } from '@/lib/motion/use-motion-mode'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingScribe } from '@/components/ui/loading-scribe'
import { Notice } from '@/components/ui/notice'
import { OriginBadge } from '@/components/ui/origin-badge'
import { Textarea } from '@/components/ui/textarea'
import {
  getMemoryTypeMessageKey,
  humanizeMemoryType,
} from '@/lib/sessions/memory-type-label'
import type { MemoryFactResponse } from '@/lib/memory/schemas'
import type { MemorySuggestion } from '@/lib/sessions/schemas'
import { cn } from '@/lib/utils'

/** A Scribe suggestion with a stable client-only key for render state. */
export type PendingSuggestion = MemorySuggestion & {
  id: string
}

/** Post-decision feedback shown after a suggestion or memory is acted on. */
export type Feedback = 'accepted' | 'edited' | 'dismissed' | 'retired' | null

/**
 * Transient feedback phase of a card on its way out.
 *
 * `stamping` pops the accepted stamp and holds it readable; `accepting` then
 * files the card away; `discarding` strikes it through and slides it off.
 */
export type SuggestionFx = 'stamping' | 'accepting' | 'discarding'

/**
 * Terminal visual state for each transient phase.
 *
 * `animate` targets, never `exit`: the page's timers own removal.
 */
const FX_TARGET = {
  stamping: { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 },
  accepting: { x: 0, y: -10, scale: 0.985, rotate: 0, opacity: 0 },
  discarding: { x: 18, y: 0, scale: 1, rotate: 0.4, opacity: 0 },
} as const

const FX_REST = FX_TARGET.stamping

/**
 * Resolve the terminal visual state for a phase under the current motion mode.
 *
 * Disabled motion holds the resting state: those modes drop movement, not
 * feedback.
 *
 * @param {SuggestionFx | undefined} fx - The card's transient phase.
 * @param {boolean} animationsEnabled - Whether Motion may actually animate.
 * @returns {(typeof FX_TARGET)[SuggestionFx]} The animate target.
 */
function fxTarget(fx: SuggestionFx | undefined, animationsEnabled: boolean) {
  if (!fx || !animationsEnabled) {
    return FX_REST
  }

  return FX_TARGET[fx]
}

/**
 * Inline "the Scribe is working on this card" indicator — the compact sibling
 * of {@link LoadingScribe}, reusing the same quill and ellipsis primitives.
 *
 * @param {object} root0 - The inline busy props.
 * @param {string} root0.label - The mono status label.
 * @returns {React.ReactElement} The inline busy indicator element.
 */
export function InlineScribeBusy({ label }: { label: string }) {
  return (
    <span
      role="status"
      className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-2)]"
    >
      <span aria-hidden="true" className="ll-quill inline-block">
        ✒
      </span>
      {label}
      <span className="ll-ellip" />
    </span>
  )
}

/**
 * Build a stable, deterministic key for a transient suggestion.
 *
 * @param {MemorySuggestion} suggestion - The suggestion to identify.
 * @param {number} index - Position within the pending list.
 * @returns {string} A stable composite key.
 */
export function suggestionId(
  suggestion: MemorySuggestion,
  index: number
): string {
  return `${suggestion.type}:${suggestion.content}:${index}`
}

/**
 * Resolve a memory type into a localized label or a humanized fallback.
 *
 * @param {ReturnType<typeof useTranslations>} t - The MemoryReview translation function.
 * @param {string | null | undefined} type - Raw memory type from a payload.
 * @returns {string} Localized type label, or a humanized fallback when the type is unknown.
 */
export function memoryTypeLabel(
  t: ReturnType<typeof useTranslations>,
  type: string | null | undefined
): string {
  const key = getMemoryTypeMessageKey(type)
  return key
    ? t(`memoryType.${key}`)
    : t('memoryTypeUnknown', { type: humanizeMemoryType(type) })
}

/**
 * Keeps retry actions visually quiet while preserving an accessible button.
 *
 * @param {object} root0 - The retry button props.
 * @param {string} root0.label - The actionable label.
 * @param {() => void} root0.onRetry - The retry callback.
 * @returns {React.ReactElement} The retry button element.
 */
export function RetryButton({
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

/**
 * Renders a single Scribe proposal with accept, edit, and dismiss affordances.
 *
 * Only this card's own in-flight accept may disable it — an accept elsewhere in
 * the margins must leave every other proposal actionable.
 *
 * @param {object} root0 - The suggestion card props.
 * @param {PendingSuggestion} root0.suggestion - The pending suggestion to render.
 * @param {SuggestionFx | undefined} root0.fx - Optional transient feedback phase.
 * @param {boolean} root0.isSubmitting - Whether THIS card's accept is in flight.
 * @param {() => void} root0.onAccept - Accept the suggestion as-is.
 * @param {() => void} root0.onEdit - Switch to the inline editor.
 * @param {() => void} root0.onDismiss - Remove the suggestion from the draft.
 * @returns {React.ReactElement} The suggestion card element.
 */
export function SuggestionCard({
  suggestion,
  fx,
  isSubmitting,
  onAccept,
  onEdit,
  onDismiss,
}: {
  suggestion: PendingSuggestion
  fx?: SuggestionFx
  isSubmitting: boolean
  onAccept: () => void
  onEdit: () => void
  onDismiss: () => void
}) {
  const t = useTranslations('MemoryReview')
  const { animationsEnabled, transition } = useMotionMode()
  const stamped = fx === 'stamping' || fx === 'accepting'
  const discarding = fx === 'discarding'
  const isBusy = isSubmitting || Boolean(fx)

  return (
    <motion.article
      data-fx={fx}
      layout="position"
      animate={fxTarget(fx, animationsEnabled)}
      // Strike leads, slide follows; both inside CARD_EXIT_MS.
      transition={transition(
        discarding
          ? { duration: DURATION.fast, delay: 0.08, ease: EASE.in }
          : {
              duration: DURATION.base,
              ease: fx === 'accepting' ? EASE.in : EASE.out,
            }
      )}
      className="relative overflow-hidden border-2 border-[var(--border)] bg-[var(--paper)] shadow-[6px_6px_0_var(--shadow)]"
    >
      {/* The stamp stays mounted through the exit phase so it never blinks out
          mid-animation. */}
      {stamped ? <span className="ll-stamp">{t('acceptedStamp')}</span> : null}
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
            {memoryTypeLabel(t, suggestion.type)}
          </span>
          <span className="border border-[var(--dotted)] px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
            {t('importance', {
              importance: t(`importanceValue.${suggestion.importance}`),
            })}
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
        {isSubmitting ? <InlineScribeBusy label={t('stamping')} /> : null}
        <button
          type="button"
          className="ml-auto font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-2)] underline disabled:opacity-50"
          onClick={onDismiss}
          disabled={isBusy}
        >
          {t('dismiss')}
        </button>
      </div>
    </motion.article>
  )
}

/**
 * Lets the DM change suggested text before accepting it as canonical memory.
 *
 * @param {object} root0 - The suggestion editor props.
 * @param {PendingSuggestion} root0.suggestion - The suggestion being edited.
 * @param {boolean} root0.isBusy - Whether a mutation is in flight.
 * @param {(content: string) => void} root0.onSave - Persist the edited text.
 * @param {() => void} root0.onCancel - Abort editing and return to the card.
 * @returns {React.ReactElement} The suggestion editor element.
 */
export function SuggestionEditor({
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
            {memoryTypeLabel(t, suggestion.type)}
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

/**
 * Shows the active facts that will feed future session preparation.
 *
 * @param {object} root0 - The active memories props.
 * @param {MemoryFactResponse[]} root0.memories - Active memory facts to render.
 * @param {boolean} root0.isLoading - Whether the facts query is loading.
 * @param {boolean} root0.isError - Whether the facts query errored.
 * @param {boolean} root0.isBusy - Whether a retire mutation is in flight.
 * @param {string} root0.retryLabel - Label for the retry control.
 * @param {(sourceSessionId?: string | null) => string} root0.sourceLabelFor - Maps a source session id to a label.
 * @param {() => void} root0.onRetry - Retry the facts query.
 * @param {(memory: MemoryFactResponse) => void} root0.onRetire - Retire a memory fact.
 * @returns {React.ReactElement} The active memories element.
 */
export function ActiveMemories({
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
                {memoryTypeLabel(t, memory.type)}
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
