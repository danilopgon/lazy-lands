'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'

import { useRouter } from '@/i18n/navigation'

import { NavLink } from '@/components/navigation/nav-link'
import { useAppLocale } from '@/i18n/use-app-locale'

import { Button } from '@/components/ui/button'
import { LoadingScribe } from '@/components/ui/loading-scribe'
import { MarkdownBody } from '@/components/ui/markdown-body'
import { Notice } from '@/components/ui/notice'
import { OriginBadge } from '@/components/ui/origin-badge'
import { getCampaignDetail } from '@/lib/campaigns/api'
import { downloadSessionPdf, getSession } from '@/lib/sessions/api'
import { getSectionLabelMessageKey } from '@/lib/sessions/section-label'
import type { GeneratedSection, SessionDetail } from '@/lib/sessions/schemas'

type ExportCampaign = { id: string; title: string }

type SessionExportViewProps = {
  campaignId: string
  sessionId: string
  campaign?: ExportCampaign
  session?: SessionDetail
  downloadFn?: typeof downloadSessionPdf
  /** Navigation override for "back to editing". Defaults to the localized router push. */
  navigate?: (href: string) => void
  /** Breadcrumb root href. Defaults to the authenticated dashboard. */
  dashboardHref?: string
  /** Breadcrumb campaign href. Defaults to the authenticated campaign detail. */
  campaignHref?: string
  /** Breadcrumb + "back to editing" draft href. Defaults to the authenticated draft route. */
  draftHref?: string
}

/** Export lifecycle: idle preview, in-flight render, success, or retryable failure. */
type ExportPhase = 'idle' | 'exporting' | 'done' | 'error'

/**
 * PDF export screen — previews the saved, edited draft, lets the DM pick which
 * persisted sections to include, and downloads an A4 PDF. IDs-only: private DM
 * notes are never previewed, selected, or sent. Mirrors the handoff export view.
 *
 * @param {SessionExportViewProps} props - Component props.
 * @returns {React.ReactElement | null} The export view element, or null when guarded out.
 */
export function SessionExportView({
  campaignId,
  sessionId,
  campaign: providedCampaign,
  session: providedSession,
  downloadFn = downloadSessionPdf,
  navigate,
  dashboardHref = '/dashboard',
  campaignHref,
  draftHref,
}: SessionExportViewProps) {
  const t = useTranslations('SessionGeneration.export')
  const tg = useTranslations('SessionGeneration.generated')
  const locale = useAppLocale()
  const router = useRouter()
  const campaignTarget = campaignHref ?? `/campaigns/${campaignId}`
  const draftTarget =
    draftHref ?? `/campaigns/${campaignId}/sessions/${sessionId}`

  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [phase, setPhase] = useState<ExportPhase>('idle')
  const [filename, setFilename] = useState<string | null>(null)

  const campaignQuery = useQuery({
    queryKey: ['campaign', campaignId, 'export'],
    queryFn: () => getCampaignDetail(campaignId),
    enabled: !providedCampaign,
  })
  const sessionQuery = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => getSession(sessionId),
    enabled: !providedSession,
  })

  const campaign = providedCampaign ?? campaignQuery.data
  const session = providedSession ?? sessionQuery.data

  if (
    (!providedCampaign && campaignQuery.isLoading) ||
    (!providedSession && sessionQuery.isLoading)
  ) {
    return (
      <main id="main-content" className="mx-auto max-w-[900px] px-6 py-16">
        <LoadingScribe
          title={t('loadingDraftTitle')}
          caption={t('loadingDraftCaption')}
        />
      </main>
    )
  }

  if (
    (!providedCampaign && campaignQuery.error) ||
    (!providedSession && sessionQuery.error)
  ) {
    return (
      <main id="main-content" className="mx-auto max-w-[900px] px-6 py-16">
        <Notice variant="error" ornament="⚠" role="alert">
          <p>{t('loadError')}</p>
          <button
            type="button"
            className="mt-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] underline"
            onClick={() => {
              void campaignQuery.refetch()
              void sessionQuery.refetch()
            }}
          >
            {t('retry')}
          </button>
        </Notice>
      </main>
    )
  }

  if (!campaign || !session) return null
  // A crafted/stale URL could point a session at a campaign it does not belong
  // to; the route campaign drives breadcrumbs and back navigation, so refuse
  // the mismatch rather than render a misleading context.
  if (session.campaign_id !== campaignId) return null

  const sections = session.generated_content?.sections ?? []
  const previewTitle =
    session.generated_content?.title ||
    tg('proposalTitle', { number: session.session_number })

  /**
   * Resolve a generated section into a localized heading, falling back to its raw label.
   *
   * @param {GeneratedSection} section - The generated section to label.
   * @returns {string} Localized section heading, or the raw label when the id is unknown.
   */
  function sectionLabel(section: GeneratedSection): string {
    const key = getSectionLabelMessageKey(section.id)
    return key ? tg(`sections.${key}`) : section.label
  }

  /** Navigate back to the editable generated-session draft. */
  function backToEditing() {
    ;(navigate ?? router.push)(draftTarget)
  }

  const breadcrumb = (
    <nav className="mb-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]">
      <NavLink href={dashboardHref}>{tg('breadcrumbs.campaigns')}</NavLink> /{' '}
      <NavLink href={campaignTarget}>{campaign.title}</NavLink> /{' '}
      <NavLink href={draftTarget}>
        {tg('breadcrumbs.draft', { number: session.session_number })}
      </NavLink>{' '}
      / <b className="text-[var(--ink)]">{t('breadcrumbExport')}</b>
    </nav>
  )

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-5">
      <div>
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
          {t('kicker', { number: session.session_number })}
        </p>
        <h1 className="mt-3 font-serif text-[38px] font-semibold leading-[1.04] tracking-[-0.03em] text-[var(--ink)]">
          {t('title')}
        </h1>
        <p className="mt-3 text-base text-[var(--ink-2)]">{t('subtitle')}</p>
      </div>
    </div>
  )

  // Missing / non-exportable draft: replace controls and preview with a clear
  // dead-end and a path back to editing (Scenario: Draft cannot be shown).
  if (sections.length === 0) {
    return (
      <main
        id="main-content"
        className="ll-view-enter mx-auto max-w-[900px] px-6 py-16"
      >
        {breadcrumb}
        {header}
        <div className="mt-8 max-w-[560px]">
          <Notice variant="plain" ornament="✦">
            <p className="font-serif text-base text-[var(--ink)]">
              {t('missingTitle')}
            </p>
            <p className="mt-1">{t('missingBody')}</p>
          </Notice>
          <Button
            type="button"
            variant="secondary"
            className="mt-5"
            onClick={backToEditing}
          >
            {t('backToEditing')}
          </Button>
        </div>
      </main>
    )
  }

  const selectedSections = sections.filter(
    (section) => !excluded.has(section.id)
  )
  const selectedIds = selectedSections.map((section) => section.id)
  const isExporting = phase === 'exporting'
  const canDownload = !isExporting && selectedIds.length > 0

  /**
   * Toggle whether a persisted section is included in the export selection.
   *
   * @param {string} sectionId - The id of the section being toggled.
   */
  function toggleSection(sectionId: string) {
    setExcluded((previous) => {
      const next = new Set(previous)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }

  /**
   * Request the PDF for the current selection. Guards against duplicate
   * in-flight requests and preserves the selection across success or failure.
   */
  async function download() {
    if (isExporting || selectedIds.length === 0) return
    setPhase('exporting')
    try {
      const name = await downloadFn(sessionId, selectedIds, locale)
      setFilename(name)
      setPhase('done')
    } catch {
      setPhase('error')
    }
  }

  return (
    <main
      id="main-content"
      className="ll-view-enter mx-auto max-w-[900px] px-6 py-16"
    >
      {breadcrumb}
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
            {t('kicker', { number: session.session_number })}
          </p>
          <h1 className="mt-3 font-serif text-[38px] font-semibold leading-[1.04] tracking-[-0.03em] text-[var(--ink)]">
            {t('title')}
          </h1>
          <p className="mt-3 text-base text-[var(--ink-2)]">{t('subtitle')}</p>
        </div>
        <div className="flex flex-col justify-end gap-2 sm:flex-row sm:flex-wrap">
          <Button type="button" variant="secondary" onClick={backToEditing}>
            {t('backToEditing')}
          </Button>
          <Button
            type="button"
            variant="accent"
            disabled={!canDownload}
            onClick={() => void download()}
          >
            {isExporting ? t('downloading') : t('download')}
          </Button>
        </div>
      </div>

      {phase === 'error' ? (
        <Notice className="mt-5" variant="error" ornament="⚠" role="alert">
          <p>{t('errorNotice')}</p>
          <button
            type="button"
            className="mt-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] underline"
            onClick={() => void download()}
          >
            {t('retry')}
          </button>
        </Notice>
      ) : null}
      {phase === 'done' ? (
        <Notice className="mt-5" variant="scribe" role="status">
          {t('successNotice', { filename: filename ?? '' })}
        </Notice>
      ) : null}

      <div className="mt-8 grid gap-8 llg:grid-cols-[280px_1fr] llg:gap-10">
        <div>
          <h2 className="font-serif text-[19px] font-semibold text-[var(--ink)]">
            {t('includeHeading')}
          </h2>
          <div className="mt-3 border-2 border-[var(--border)] bg-[var(--paper)] px-4 py-2 shadow-[4px_4px_0_var(--shadow)]">
            {sections.map((section) => (
              <label
                key={section.id}
                className="flex cursor-pointer items-center gap-2.5 border-b border-dotted border-[var(--dotted)] py-2 text-[13.5px] text-[var(--ink)] last:border-b-0"
              >
                <input
                  type="checkbox"
                  checked={!excluded.has(section.id)}
                  onChange={() => toggleSection(section.id)}
                />
                <span>{sectionLabel(section)}</span>
                {section.origin === 'edited' ? (
                  <OriginBadge origin="edited" className="ml-auto" />
                ) : null}
              </label>
            ))}
            <label className="flex items-center gap-2.5 py-2 text-[13.5px] text-[var(--ink-3)]">
              <input type="checkbox" checked={false} disabled readOnly />
              <span>{t('privateNotes')}</span>
              <span className="ml-auto font-mono text-[9.5px] font-semibold uppercase tracking-[0.09em] text-[var(--mute)]">
                {t('neverExported')}
              </span>
            </label>
          </div>
          <p className="mt-2.5 text-xs text-[var(--ink-3)]">
            {t('sectionCount', {
              selected: selectedIds.length,
              total: sections.length,
            })}
          </p>
        </div>

        <div className="max-w-[640px]">
          {isExporting ? (
            <div className="border-2 border-dashed border-[var(--dotted)] p-5">
              <LoadingScribe
                title={t('loadingTitle')}
                caption={t('loadingCaption')}
              />
            </div>
          ) : (
            <article className="border-2 border-[var(--border)] bg-[var(--paper)] p-8 shadow-[4px_4px_0_var(--shadow)]">
              <h2 className="font-serif text-[26px] font-semibold leading-tight text-[var(--ink)]">
                {previewTitle}
              </h2>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--ink-3)]">
                {t('previewMeta', {
                  campaign: campaign.title,
                  number: session.session_number,
                })}
              </p>
              {selectedSections.map((section) => (
                <div key={section.id} className="mt-5">
                  <h3 className="font-serif text-[17px] font-semibold text-[var(--ink)]">
                    {sectionLabel(section)}
                  </h3>
                  <MarkdownBody className="mt-2">{section.body}</MarkdownBody>
                </div>
              ))}
              <p className="mt-7 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--mute)]">
                {t('previewFooter')}
              </p>
            </article>
          )}
        </div>
      </div>
    </main>
  )
}
