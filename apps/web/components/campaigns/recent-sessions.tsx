'use client'

import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

import type { SessionResponse } from '@/lib/sessions/schemas'

type RecentSessionsProps = {
  campaignId: string
  sessions: SessionResponse[] | undefined
  isLoading: boolean
  isError: boolean
}

/** Cap on how many recent sessions render in the campaign-detail sidebar. */
const MAX_VISIBLE_SESSIONS = 3

/**
 * Campaign detail "/02 Recent sessions" panel — live `GET /campaigns/{id}/sessions`
 * list (the most recent sessions, capped and shown in chronological order),
 * an empty state with a "Log session" CTA,
 * or a load-error fallback. Loading renders nothing extra; the surrounding
 * page already shows its own top-level loading state while the campaign
 * itself is fetched, and a silent loading gap here is preferable to a second
 * spinner competing for attention.
 *
 * @param {object} root0 - The recent sessions props.
 * @param {string} root0.campaignId - The owning campaign's id (for the CTA link).
 * @param {SessionResponse[] | undefined} root0.sessions - The chronological session list, ascending.
 * @param {boolean} root0.isLoading - Whether the sessions query is in flight.
 * @param {boolean} root0.isError - Whether the sessions query failed.
 * @returns {React.ReactElement | null} The recent sessions panel element.
 */
export function RecentSessions({
  campaignId,
  sessions,
  isLoading,
  isError,
}: RecentSessionsProps) {
  const t = useTranslations('Sessions')
  const tc = useTranslations('Campaigns')

  if (!isError && (isLoading || !sessions)) {
    return (
      <div
        aria-busy="true"
        className="min-h-[222px] space-y-0 border-2 border-[var(--border)] bg-[var(--paper)] px-4 shadow-[4px_4px_0_var(--shadow)]"
      >
        <p
          role="status"
          aria-label={tc('detail.sessionsLoading')}
          className="sr-only"
        >
          {tc('detail.sessionsLoading')}
        </p>
        {Array.from({ length: MAX_VISIBLE_SESSIONS }, (_, index) => (
          <div
            key={index}
            data-testid="recent-sessions-skeleton-row"
            className="flex min-h-[74px] flex-col justify-center gap-2 border-b border-dotted border-[var(--dotted)] py-3 last:border-b-0"
          >
            <span aria-hidden="true" className="h-4 w-24 bg-[var(--paper-2)]" />
            <span
              aria-hidden="true"
              className="h-3 w-full bg-[var(--paper-2)]"
            />
            <span
              aria-hidden="true"
              className="h-3 w-3/5 bg-[var(--paper-2)]"
            />
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <p className="text-sm italic text-[var(--ink-3)]">
        {tc('detail.sessionsLoadError')}
      </p>
    )
  }

  if (!sessions || sessions.length === 0) {
    return (
      <EmptyState
        title={t('history.emptyTitle')}
        description={t('history.emptyDescription')}
        action={
          <Button variant="ink" asChild>
            <Link href={`/campaigns/${campaignId}/sessions/new`}>
              {t('history.logSession')}
            </Link>
          </Button>
        }
      />
    )
  }

  // Take the most recent sessions, then restore chronological (ascending)
  // order for display so the panel matches the backend contract and the
  // session-log-ui spec (GET returns sessions chronologically).
  const recent = [...sessions]
    .sort((a, b) => b.session_number - a.session_number)
    .slice(0, MAX_VISIBLE_SESSIONS)
    .sort((a, b) => a.session_number - b.session_number)

  return (
    <div className="ll-panel-settle space-y-3">
      {recent.map((session) => {
        const sessionHref = `/campaigns/${campaignId}/sessions/${session.id}`
        const hasGeneratedContent = session.has_generated_content
        const isDraft = hasGeneratedContent && session.status === 'draft'
        return (
          <div
            key={session.id}
            className="border-b border-dotted border-[var(--dotted)] pb-3 last:border-b-0"
          >
            <div className="flex items-baseline gap-2">
              {hasGeneratedContent ? (
                <Link
                  href={sessionHref}
                  className="font-serif text-[15px] font-semibold text-[var(--ink)] hover:underline"
                >
                  {t('history.sessionLabel', {
                    number: session.session_number,
                  })}
                </Link>
              ) : (
                <span className="font-serif text-[15px] font-semibold text-[var(--ink)]">
                  {t('history.sessionLabel', {
                    number: session.session_number,
                  })}
                </span>
              )}
              {isDraft ? (
                <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.09em] text-[var(--mute)]">
                  {t('history.draftBadge')}
                </span>
              ) : null}
            </div>
            {session.summary ? (
              hasGeneratedContent ? (
                <Link
                  href={sessionHref}
                  data-testid="session-occurrence-excerpt"
                  className="mt-1 block line-clamp-2 text-sm leading-relaxed text-[var(--ink-2)] hover:underline"
                >
                  {session.summary}
                </Link>
              ) : (
                <p
                  data-testid="session-occurrence-excerpt"
                  className="mt-1 line-clamp-2 text-sm leading-relaxed text-[var(--ink-2)]"
                >
                  {session.summary}
                </p>
              )
            ) : null}
            {isDraft ? (
              <Link
                href={sessionHref}
                className="mt-1 inline-flex font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)] hover:underline"
              >
                {t('history.resumeDraft')}
              </Link>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
