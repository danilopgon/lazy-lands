'use client'

import { FormEvent, useMemo, useState, type SelectHTMLAttributes } from 'react'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'

import { useRouter } from '@/i18n/navigation'

import { NavLink } from '@/components/navigation/nav-link'

import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { LoadingScribe } from '@/components/ui/loading-scribe'
import { Notice } from '@/components/ui/notice'
import { Textarea } from '@/components/ui/textarea'
import { getCampaignDetail } from '@/lib/campaigns/api'
import {
  generateSession,
  getSessions,
  SessionValidationError,
} from '@/lib/sessions/api'
import type {
  GenerateSessionResponse,
  SessionResponse,
} from '@/lib/sessions/schemas'

type ContextRow = readonly [string, string]

type PrepareCampaign = {
  id: string
  title: string
  sessionNumber?: number
  contextRows?: readonly ContextRow[]
}

type PrepareSessionViewProps = {
  campaignId: string
  campaign?: PrepareCampaign
  sessions?: SessionResponse[]
  generateSessionFn?: typeof generateSession
  navigate?: (href: string) => void
  /** Breadcrumb root href. Defaults to the authenticated dashboard. */
  dashboardHref?: string
  /** Breadcrumb campaign href. Defaults to the authenticated campaign detail. */
  campaignHref?: string
}

const toneOptions = [
  { value: 'Keep current, low-magic intrigue', labelKey: 'tone.keepCurrent' },
  { value: 'Darker', labelKey: 'tone.darker' },
  { value: 'Lighter', labelKey: 'tone.lighter' },
  { value: 'More action', labelKey: 'tone.moreAction' },
  { value: 'More roleplay', labelKey: 'tone.moreRoleplay' },
] as const
const paceOptions = [
  { value: 'Balanced', labelKey: 'pace.balanced' },
  { value: 'Slow burn', labelKey: 'pace.slowBurn' },
  { value: 'Breakneck', labelKey: 'pace.breakneck' },
] as const
const difficultyOptions = [
  { value: 'Standard', labelKey: 'difficulty.standard' },
  { value: 'Forgiving', labelKey: 'difficulty.forgiving' },
  { value: 'Deadly', labelKey: 'difficulty.deadly' },
] as const
type ToneOption = (typeof toneOptions)[number]['value']
type PaceOption = (typeof paceOptions)[number]['value']
type DifficultyOption = (typeof difficultyOptions)[number]['value']

/**
 * Prepare-next-session view — gathers optional DM direction, shows the Scribe
 * context that will be read, and submits the generation request, navigating to
 * the resumable generated draft on success.
 *
 * @param {PrepareSessionViewProps} props - Component props.
 * @returns {React.ReactElement} The prepare session view element.
 */
export function PrepareSessionView({
  campaignId,
  campaign: providedCampaign,
  sessions: providedSessions,
  generateSessionFn = generateSession,
  navigate,
  dashboardHref = '/dashboard',
  campaignHref,
}: PrepareSessionViewProps) {
  const t = useTranslations('SessionGeneration.prepare')
  const tc = useTranslations('Campaigns')
  const router = useRouter()
  const [goal, setGoal] = useState('')
  const [tone, setTone] = useState<ToneOption>(toneOptions[0].value)
  const [pace, setPace] = useState<PaceOption>(paceOptions[0].value)
  const [difficulty, setDifficulty] = useState<DifficultyOption>(
    difficultyOptions[0].value
  )
  const [extra, setExtra] = useState('')
  const [phase, setPhase] = useState<'form' | 'loading' | 'error'>('form')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const campaignQuery = useQuery({
    queryKey: ['campaign', campaignId, 'prepare'],
    queryFn: () => getCampaignDetail(campaignId),
    enabled: !providedCampaign,
  })
  const sessionsQuery = useQuery({
    queryKey: ['campaign', campaignId, 'sessions', 'prepare'],
    queryFn: () => getSessions(campaignId),
    enabled: !providedSessions && !providedCampaign?.sessionNumber,
  })

  const campaign = providedCampaign ?? campaignQuery.data
  const sessions = providedSessions ?? sessionsQuery.data
  const sessionNumber =
    providedCampaign?.sessionNumber ?? deriveNextSessionNumber(sessions)
  const contextRows = useMemo(
    () =>
      providedCampaign?.contextRows ?? [
        [t('context.campaignSummary'), t('context.campaignSummaryMeta')],
        [t('context.lastSession'), t('context.lastSessionMeta')],
        [t('context.worldState'), t('context.worldStateMeta')],
        [t('context.activeNpcs'), t('context.activeNpcsMeta')],
        [t('context.factions'), t('context.factionsMeta')],
        [t('context.openArcs'), t('context.openArcsMeta')],
        [t('context.acceptedMemories'), t('context.acceptedMemoriesMeta')],
      ],
    [providedCampaign?.contextRows, t]
  )

  if (!providedCampaign && campaignQuery.isLoading) {
    return (
      <LoadingScribe
        title={tc('screen.loadingTitle')}
        caption={tc('screen.openingChronicle')}
      />
    )
  }

  if (!providedCampaign && campaignQuery.error) {
    return (
      <Notice variant="error" ornament="⚠" role="alert">
        <p>{tc('screen.loadError')}</p>
        <button
          type="button"
          className="mt-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] underline"
          onClick={() => campaignQuery.refetch()}
        >
          {tc('screen.retry')}
        </button>
      </Notice>
    )
  }

  if (!campaign) return null

  /**
   * Submit the validated direction and navigate to the generated draft on success.
   *
   * @param {FormEvent<HTMLFormElement>} [event] - The form submit event, if any.
   */
  async function onSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    setPhase('loading')
    setErrorMessage(null)
    try {
      const response: Pick<GenerateSessionResponse, 'id'> =
        await generateSessionFn(campaignId, {
          goal,
          tone,
          pace,
          difficulty,
          additional_instructions: extra,
        })
      ;(navigate ?? router.push)(
        `/campaigns/${campaignId}/sessions/${response.id}`
      )
    } catch (error) {
      setErrorMessage(
        error instanceof SessionValidationError
          ? t('validationError')
          : t('error')
      )
      setPhase('error')
    }
  }

  if (phase === 'loading') {
    return (
      <div className="mx-auto max-w-[720px] px-6 py-16">
        <LoadingScribe
          title={
            sessionNumber
              ? t('loadingTitle', { number: sessionNumber })
              : t('loadingTitleUnknown')
          }
          caption={t('loadingCaption')}
        />
      </div>
    )
  }

  return (
    <main
      id="main-content"
      className="ll-view-enter mx-auto max-w-[900px] px-6 py-16"
    >
      <nav className="mb-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]">
        <NavLink href={dashboardHref} className="hover:text-[var(--ink)]">
          {tc('breadcrumbRoot')}
        </NavLink>{' '}
        /{' '}
        <NavLink
          href={campaignHref ?? `/campaigns/${campaignId}`}
          className="hover:text-[var(--ink)]"
        >
          {campaign.title}
        </NavLink>{' '}
        / <b className="text-[var(--ink)]">{t('breadcrumb')}</b>
      </nav>
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
        {t('kicker')}
      </p>
      <h1 className="mt-3 font-serif text-[38px] font-semibold leading-[1.04] tracking-[-0.03em] text-[var(--ink)]">
        {sessionNumber
          ? t('title', { number: sessionNumber })
          : t('titleUnknown')}
      </h1>
      <p className="mt-4 max-w-[600px] text-base leading-relaxed text-[var(--ink-2)]">
        {t('subtitle')}
      </p>

      {phase === 'error' ? (
        <Notice className="mt-5" variant="error" ornament="⚠" role="alert">
          <div className="flex flex-wrap items-center gap-3">
            <span>{errorMessage ?? t('error')}</span>
            <button
              type="button"
              className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] underline"
              onClick={() => onSubmit()}
            >
              {t('tryAgain')}
            </button>
          </div>
        </Notice>
      ) : null}

      <div className="mt-8 grid gap-8 llg:grid-cols-[1.5fr_1fr] llg:gap-10">
        <section>
          <h2 className="mb-3 font-serif text-[19px] font-semibold text-[var(--ink)]">
            {t('contextHeading')}
          </h2>
          <div className="border-2 border-[var(--border)] bg-[var(--paper)] px-5 py-1 shadow-[6px_6px_0_var(--shadow)]">
            {contextRows.map(([label, meta]) => (
              <div
                key={label}
                className="flex items-center gap-4 border-b border-dotted border-[var(--dotted)] py-4 last:border-b-0"
              >
                <div>
                  <p className="text-[13.5px] font-semibold text-[var(--ink)]">
                    {label}
                  </p>
                  <p className="text-xs text-[var(--ink-3)]">{meta}</p>
                </div>
                <span className="ml-auto font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--good)]">
                  {t('included')}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-[var(--ink-3)]">
            ✦ {t.rich('privacy', { b: (chunks) => <b>{chunks}</b> })}
          </p>
        </section>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="font-serif text-[19px] font-semibold text-[var(--ink)]">
              {t('directionHeading')}
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--ink-3)]">
              {t('allOptional')}
            </span>
          </div>
          <Field label={t('goalLabel')} optional>
            <Textarea
              rows={2}
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              placeholder={t('goalPlaceholder')}
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t('toneLabel')}>
              <Select
                value={tone}
                onValueChange={setTone}
                options={toneOptions}
                translateLabel={t}
              />
            </Field>
            <Field label={t('paceLabel')}>
              <Select
                value={pace}
                onValueChange={setPace}
                options={paceOptions}
                translateLabel={t}
              />
            </Field>
          </div>
          <Field label={t('difficultyLabel')}>
            <Select
              value={difficulty}
              onValueChange={setDifficulty}
              options={difficultyOptions}
              translateLabel={t}
            />
          </Field>
          <Field label={t('extraLabel')} optional>
            <Textarea
              rows={3}
              value={extra}
              onChange={(event) => setExtra(event.target.value)}
              placeholder={t('extraPlaceholder')}
            />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" variant="accent">
              {t('submit')}
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}

/**
 * Styled native select bound to a finite option set, localized via a label resolver.
 *
 * @param {object} root0 - The select props.
 * @param {T} root0.value - Currently selected value.
 * @param {(value: T) => void} root0.onValueChange - Updates the selected value.
 * @param {readonly { value: T; labelKey: string }[]} root0.options - Finite localized options.
 * @param {(key: string) => string} root0.translateLabel - Resolves a label key to display copy.
 * @param {string} [root0.id] - Optional element id for label association.
 * @returns {React.ReactElement} The select element.
 * @template T - The finite string union of option values.
 */
function Select<T extends string>({
  value,
  onValueChange,
  options,
  translateLabel,
  id,
  ...props
}: {
  value: T
  onValueChange: (value: T) => void
  options: readonly { value: T; labelKey: string }[]
  translateLabel: (key: string) => string
  id?: string
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'>) {
  return (
    <select
      id={id}
      className="h-11 w-full border-[1.5px] border-dashed border-[var(--dotted)] bg-[var(--paper)] px-3 font-sans text-sm text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      value={value}
      onChange={(event) => onValueChange(event.target.value as T)}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {translateLabel(option.labelKey)}
        </option>
      ))}
    </select>
  )
}

/**
 * Return the next session number based on the highest logged session number.
 *
 * @param {SessionResponse[] | undefined} sessions - Logged sessions, ascending or unordered.
 * @returns {number | null} The next session number, or null when none exist.
 */
function deriveNextSessionNumber(
  sessions: SessionResponse[] | undefined
): number | null {
  if (!sessions?.length) return null
  return Math.max(...sessions.map((session) => session.session_number)) + 1
}
