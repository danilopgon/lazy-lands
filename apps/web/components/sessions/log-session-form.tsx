'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslations } from 'next-intl'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'

import { useRouter } from '@/i18n/navigation'

import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { LoadingScribe } from '@/components/ui/loading-scribe'
import { Notice } from '@/components/ui/notice'
import { registerSessionRequestSchema } from '@/lib/sessions/schemas'
import type { SessionResponse } from '@/lib/sessions/schemas'
import {
  completeSession,
  getSessions,
  registerSession,
} from '@/lib/sessions/api'
import { writeMemoryReviewDraft } from '@/lib/sessions/memory-review-draft'

import { z } from 'zod'

type LogSessionFormValues = {
  summary: string
  consequences?: string
}

/**
 * The campaign's open generated draft, if any — the highest-numbered session
 * the Scribe generated whose played outcome is not yet recorded.
 *
 * The draft test mirrors `RecentSessions`: `summary` is auto-filled from the
 * synopsis at generation time, so only recorded `consequences` mark a
 * generated session as logged.
 *
 * @param {SessionResponse[] | undefined} sessions - The campaign's session history, if loaded.
 * @returns {SessionResponse | null} The open draft, or `null` when there is none.
 */
function findOpenDraft(
  sessions: SessionResponse[] | undefined
): SessionResponse | null {
  if (!sessions) return null
  return sessions
    .filter((session) => session.has_generated_content && !session.consequences)
    .reduce<SessionResponse | null>(
      (latest, session) =>
        !latest || session.session_number > latest.session_number
          ? session
          : latest,
      null
    )
}

type LogSessionFormProps = {
  campaignId: string
  /**
   * Register adapter. Defaults to the real `POST /campaigns/{id}/sessions`
   * client; the public demo injects a local implementation that returns fixture
   * memory suggestions without any request.
   */
  registerSessionFn?: typeof registerSession
  /**
   * Complete adapter for `POST /sessions/{id}/complete` — used instead of
   * `registerSessionFn` when the DM links this record to an open draft.
   * The demo injects a local implementation.
   */
  completeSessionFn?: typeof completeSession
  /**
   * Session-history source, used only to detect an open generated draft.
   * The demo injects its in-memory list so no request is ever made.
   */
  getSessionsFn?: typeof getSessions
  /** Navigation override. Defaults to the localized router push. */
  navigate?: (href: string) => void
  /**
   * Whether to stash the returned suggestions in session storage for the memory
   * review screen. The demo turns this off because it carries suggestions in
   * its own in-memory store instead.
   */
  persistDraft?: boolean
  /** Href to navigate to after a successful register. */
  reviewHref?: (response: { campaignId: string; sessionId: string }) => string
}

/**
 * `/campaigns/:id/sessions/new` form island — the two in-scope fields
 * (`summary` required, `consequences` optional). On success the DM is routed
 * to the memory review screen with the returned suggestions.
 *
 * Draft-aware: when the campaign has an open generated draft, this record
 * defaults to COMPLETING that draft (`POST /sessions/{id}/complete`) rather
 * than inserting a second row for a session the DM already prepared. The
 * choice is always visible and reversible — only the DM knows whether the
 * session they played was the prepared one. With no draft (or if the history
 * cannot be loaded) the form behaves exactly as before and registers a new
 * session.
 *
 * @param {object} root0 - The log-session form props.
 * @param {string} root0.campaignId - The owning campaign's id.
 * @param {typeof registerSession} [root0.registerSessionFn] - Optional register adapter.
 * @param {typeof completeSession} [root0.completeSessionFn] - Optional complete adapter.
 * @param {typeof getSessions} [root0.getSessionsFn] - Optional session-history source.
 * @param {(href: string) => void} [root0.navigate] - Optional navigation override.
 * @param {boolean} [root0.persistDraft] - Whether to stash suggestions in session storage.
 * @param {(response: { campaignId: string; sessionId: string }) => string} [root0.reviewHref] - Optional review href builder.
 * @returns {React.ReactElement} The log-session form element.
 */
export function LogSessionForm({
  campaignId,
  registerSessionFn = registerSession,
  completeSessionFn = completeSession,
  getSessionsFn = getSessions,
  navigate,
  persistDraft = true,
  reviewHref,
}: LogSessionFormProps) {
  const t = useTranslations('Sessions')
  const te = useTranslations('Entities')
  const router = useRouter()
  const [hasSubmitError, setHasSubmitError] = useState(false)
  // The DM's explicit opt-out of the draft. Kept as "prefer new" rather than
  // "link to draft" so the default needs no syncing once the draft resolves.
  const [prefersNewSession, setPrefersNewSession] = useState(false)

  // Detecting the draft must never block or fail the register path: the form
  // renders immediately in register mode and reveals the choice once (and if)
  // the history arrives. A failed history query simply leaves `draft` null.
  const { data: sessions } = useQuery({
    queryKey: ['sessions', campaignId],
    queryFn: () => getSessionsFn(campaignId),
  })
  const draft = useMemo(() => findOpenDraft(sessions), [sessions])
  const isLinkedToDraft = Boolean(draft) && !prefersNewSession

  const formSchema = useMemo(
    () =>
      registerSessionRequestSchema.extend({
        summary: z.string().trim().min(1, t('summaryRequired')).max(8000),
      }),
    [t]
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LogSessionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { summary: '', consequences: '' },
  })

  const mutation = useMutation({
    mutationFn: (data: LogSessionFormValues) => {
      const payload = {
        summary: data.summary,
        consequences: data.consequences?.trim() ? data.consequences : undefined,
      }
      return draft && isLinkedToDraft
        ? completeSessionFn(draft.id, payload)
        : registerSessionFn(campaignId, payload)
    },
    onSuccess: (response) => {
      if (persistDraft) {
        try {
          writeMemoryReviewDraft({
            campaign_id: campaignId,
            session_id: response.session_id,
            session_number: response.session_number,
            memory_suggestions: response.memory_suggestions,
          })
        } catch {
          // Draft storage is best-effort. Navigation still lets the DM continue
          // to the safe empty review state if sessionStorage is unavailable.
        }
      }
      const href = reviewHref
        ? reviewHref({ campaignId, sessionId: response.session_id })
        : `/campaigns/${campaignId}/memory/review?session=${response.session_id}`
      ;(navigate ?? router.push)(href)
    },
    onError: () => {
      // The DM's exact typed text stays in the form (react-hook-form does not
      // reset on mutation error), so the copy is the fixed reassurance from
      // the handoff rather than the raw backend message — the point of this
      // state is "nothing was lost", not the failure's technical detail.
      setHasSubmitError(true)
    },
  })

  /**
   * Handle validated form submission — clears any prior error state and
   * fires the register-session mutation.
   *
   * @param {LogSessionFormValues} data - The validated form data.
   */
  function onSubmit(data: LogSessionFormValues) {
    setHasSubmitError(false)
    mutation.mutate(data)
  }

  // While saving, replace the whole form with the quill loading takeover —
  // the register + summarize + suggest round trip is synchronous on the
  // backend, so a static disabled form would read as a frozen page.
  if (mutation.isPending) {
    return (
      <LoadingScribe title={t('savingTitle')} caption={t('savingCaption')} />
    )
  }

  return (
    <>
      {hasSubmitError && (
        <Notice className="mb-5" variant="error" ornament="⚠" role="alert">
          {t('errorMessage')}
        </Notice>
      )}

      {draft && (
        <Notice className="mb-5" variant="plain" ornament="✦">
          <p>
            {isLinkedToDraft
              ? t('draftLink.linkedMessage', { number: draft.session_number })
              : t('draftLink.newMessage', { number: draft.session_number })}
          </p>
          <button
            type="button"
            className="mt-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)] underline"
            onClick={() => setPrefersNewSession((prefers) => !prefers)}
          >
            {isLinkedToDraft
              ? t('draftLink.switchToNew')
              : t('draftLink.switchToDraft', { number: draft.session_number })}
          </button>
        </Notice>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="border-2 border-[var(--border)] bg-[var(--paper)] p-6 shadow-[6px_6px_0_var(--shadow)]"
        noValidate
      >
        <Field label={t('summaryLabel')} error={errors.summary?.message}>
          <Textarea
            id="summary"
            rows={7}
            placeholder={t('summaryPlaceholder')}
            {...register('summary')}
          />
        </Field>
        <div className="mt-4">
          <Field label={`${t('consequencesLabel')} · ${te('optional')}`}>
            <Textarea
              id="consequences"
              rows={3}
              placeholder={t('consequencesPlaceholder')}
              {...register('consequences')}
            />
          </Field>
        </div>
        <div className="mt-6 flex justify-end">
          <Button type="submit" variant="accent">
            {t('submit')}
          </Button>
        </div>
      </form>
    </>
  )
}
