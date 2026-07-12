'use client'

import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { Link, useRouter } from '@/i18n/navigation'

import { Button } from '@/components/ui/button'
import { LoadingScribe } from '@/components/ui/loading-scribe'
import { MarkdownBody } from '@/components/ui/markdown-body'
import { Notice } from '@/components/ui/notice'
import { OriginBadge } from '@/components/ui/origin-badge'
import { Textarea } from '@/components/ui/textarea'
import { getCampaignDetail } from '@/lib/campaigns/api'
import { getMemoryFacts } from '@/lib/memory/api'
import type { MemoryFactResponse } from '@/lib/memory/schemas'
import {
  getSession,
  regenerateSection,
  updateSessionContent,
} from '@/lib/sessions/api'
import {
  getMemoryTypeMessageKey,
  humanizeMemoryType,
} from '@/lib/sessions/memory-type-label'
import { getSectionLabelMessageKey } from '@/lib/sessions/section-label'
import type {
  GeneratedContent,
  GeneratedSection,
  SectionId,
  SessionDetail,
} from '@/lib/sessions/schemas'

type GeneratedCampaign = { id: string; title: string }

type GeneratedSessionViewProps = {
  campaignId: string
  sessionId: string
  campaign?: GeneratedCampaign
  session?: SessionDetail
  memories?: MemoryFactResponse[]
  updateSessionFn?: typeof updateSessionContent
  regenerateSectionFn?: typeof regenerateSection
}

/**
 * Generated session draft view — renders the Scribe's proposal sections, the
 * woven-memory sidebar, legend, and private DM notes. Each section is editable
 * inline and persisted via PATCH; the generated-proposal title drives the H1.
 *
 * @param {GeneratedSessionViewProps} props - Component props.
 * @returns {React.ReactElement} The generated session view element.
 */
export function GeneratedSessionView({
  campaignId,
  sessionId,
  campaign: providedCampaign,
  session: providedSession,
  memories: providedMemories,
  updateSessionFn = updateSessionContent,
  regenerateSectionFn = regenerateSection,
}: GeneratedSessionViewProps) {
  const t = useTranslations('SessionGeneration.generated')
  const te = useTranslations('Entities')
  const tm = useTranslations('MemoryReview')
  const router = useRouter()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sections, setSections] = useState<GeneratedSection[] | null>(
    providedSession?.generated_content?.sections ?? null
  )
  const [notes, setNotes] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Per-section regeneration state — keyed by section id, NOT a single
  // global flag, so unrelated sections stay fully interactive while one
  // section regenerates (NFR-UI-2).
  const [regeneratingSectionIds, setRegeneratingSectionIds] = useState<
    Set<string>
  >(new Set())

  const campaignQuery = useQuery({
    queryKey: ['campaign', campaignId, 'generated'],
    queryFn: () => getCampaignDetail(campaignId),
    enabled: !providedCampaign,
  })
  const sessionQuery = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => getSession(sessionId),
    enabled: !providedSession,
  })
  const memoriesQuery = useQuery({
    queryKey: ['campaign', campaignId, 'memory-facts', 'active', 'generated'],
    queryFn: () => getMemoryFacts(campaignId, { status: 'active' }),
    enabled: !providedMemories,
  })

  const campaign = providedCampaign ?? campaignQuery.data
  const session = providedSession ?? sessionQuery.data
  const activeMemories = providedMemories ?? memoriesQuery.data
  const visibleSections = sections ?? session?.generated_content?.sections ?? []
  const generatedTitle = session?.generated_content?.title
  const title =
    generatedTitle ||
    t('proposalTitle', { number: session?.session_number ?? 0 })

  const continuityLinks = session?.generated_content?.continuity_links
  const linkedMemories = useMemo(() => {
    if (!continuityLinks?.length) return []

    const linkedIds = new Set(
      continuityLinks.map((link) => link.memory_fact_id)
    )
    return (activeMemories ?? []).filter(
      (memory) => memory.status === 'active' && linkedIds.has(memory.id)
    )
  }, [activeMemories, continuityLinks])

  if (
    (!providedCampaign && campaignQuery.isLoading) ||
    (!providedSession && sessionQuery.isLoading) ||
    (!providedMemories && memoriesQuery.isLoading)
  ) {
    return (
      <main id="main-content" className="mx-auto max-w-[900px] px-6 py-16">
        <LoadingScribe
          title={t('loadingTitle')}
          caption={t('loadingCaption')}
        />
      </main>
    )
  }

  if (
    (!providedCampaign && campaignQuery.error) ||
    (!providedSession && sessionQuery.error) ||
    (!providedMemories && memoriesQuery.error)
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
              void memoriesQuery.refetch()
            }}
          >
            {te('retry')}
          </button>
        </Notice>
      </main>
    )
  }

  if (!campaign || !session) return null
  // Guard against opening a session under a campaign it does not belong to
  // (e.g. a crafted/stale URL): the route campaign drives breadcrumbs and
  // actions, so a mismatch would let edits target the wrong campaign context.
  if (session.campaign_id !== campaignId) return null

  /**
   * Show a transient toast message and auto-clear it shortly after.
   *
   * @param {string} message - Toast text to display.
   */
  function showToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 2600)
  }

  /**
   * Build the next generated-content payload, preserving continuity links and unknown fields.
   *
   * @param {GeneratedSection[]} nextSections - The next visible section list.
   * @returns {GeneratedContent} Merged generated-content payload for PATCH.
   */
  function generatedContentWithSections(
    nextSections: GeneratedSection[]
  ): GeneratedContent {
    return {
      ...(session?.generated_content ?? { sections: nextSections }),
      sections: nextSections,
    }
  }

  /**
   * Return visible sections, merging the currently open editor draft when present.
   *
   * @returns {GeneratedSection[]} Sections representing the latest DM-visible draft.
   */
  function sectionsIncludingOpenDraft(): GeneratedSection[] {
    if (!editing) return visibleSections
    return visibleSections.map((section) =>
      section.id === editing
        ? { ...section, body: draft, origin: 'edited' as const }
        : section
    )
  }

  /**
   * Resolve a memory type into a localized label or a humanized fallback.
   *
   * @param {string | null | undefined} type - Raw memory type from a payload.
   * @returns {string} Localized type label, or a humanized fallback when unknown.
   */
  function memoryTypeLabel(type: string | null | undefined): string {
    const key = getMemoryTypeMessageKey(type)
    return key
      ? tm(`memoryType.${key}`)
      : tm('memoryTypeUnknown', { type: humanizeMemoryType(type) })
  }

  /**
   * Resolve a generated section into a localized heading, falling back to its raw label.
   *
   * @param {GeneratedSection} section - The generated section to label.
   * @returns {string} Localized section heading, or the raw label when the id is unknown.
   */
  function sectionLabel(section: GeneratedSection): string {
    const key = getSectionLabelMessageKey(section.id)
    return key ? t(`sections.${key}`) : section.label
  }

  /**
   * Return a human-readable source label for linked session ids when one is available.
   *
   * @param {string | null | undefined} sourceSessionId - Raw memory source session id.
   * @returns {string | null} Localized source session label, or null when not displayable.
   */
  function sourceSessionLabel(
    sourceSessionId: string | null | undefined
  ): string | null {
    const match = String(sourceSessionId ?? '').match(/^session-(\d+)$/i)
    return match ? t('sourceSession', { number: Number(match[1]) }) : null
  }

  /**
   * Persist the edited section body, flipping its origin to "edited".
   *
   * @param {string} sectionId - The id of the section being saved.
   */
  async function saveSection(sectionId: string) {
    if (!session) return
    const nextSections = visibleSections.map((section) =>
      section.id === sectionId
        ? { ...section, body: draft, origin: 'edited' as const }
        : section
    )
    try {
      const payload = {
        generated_content: generatedContentWithSections(nextSections),
        ...(sectionId === 'synopsis' ? { summary: draft } : {}),
      }
      const updated = await updateSessionFn(sessionId, {
        ...payload,
      })
      setSections(updated.generated_content?.sections ?? nextSections)
      setEditing(null)
      setError(null)
      showToast(t('toast.sectionSaved'))
    } catch {
      setError(t('sectionSaveError'))
    }
  }

  /**
   * Rewrite one section via a fresh, pure (no steering input) Scribe call.
   *
   * MUST both update local `sections` state AND invalidate the TanStack
   * query for this session — the local `sections` state shadows the query,
   * so relying on invalidation alone would leave the DM looking at a stale
   * body until an unrelated refetch happened to occur.
   *
   * @param {string} sectionId - The id of the section to regenerate.
   */
  async function regenerateSectionAction(sectionId: string) {
    setRegeneratingSectionIds((previous) => new Set(previous).add(sectionId))
    setError(null)
    try {
      const updated = await regenerateSectionFn(
        sessionId,
        sectionId as SectionId
      )
      setSections(updated.generated_content?.sections ?? visibleSections)
      await queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
      showToast(t('toast.sectionRegenerated'))
    } catch {
      setError(t('regenerateError'))
    } finally {
      setRegeneratingSectionIds((previous) => {
        const next = new Set(previous)
        next.delete(sectionId)
        return next
      })
    }
  }

  /** Persist the full visible section state as a single "Save changes" action. */
  async function saveAll() {
    const nextSections = sectionsIncludingOpenDraft()
    const payload = {
      generated_content: generatedContentWithSections(nextSections),
      ...(editing === 'synopsis' ? { summary: draft } : {}),
    }
    try {
      const updated = await updateSessionFn(sessionId, payload)
      setSections(updated.generated_content?.sections ?? nextSections)
      setEditing(null)
      setError(null)
      showToast(t('toast.allSaved'))
    } catch {
      setError(t('saveAllError'))
    }
  }

  /** Copy the visible sections to the clipboard and confirm only on success. */
  function copyAll() {
    const text = sectionsIncludingOpenDraft()
      .map(
        (section) => `${sectionLabel(section).toUpperCase()}\n${section.body}`
      )
      .join('\n\n')
    const clipboard = navigator.clipboard
    if (!clipboard) return
    void clipboard
      .writeText(text)
      .then(() => showToast(t('toast.copied')))
      .catch(() => setError(t('copyError')))
  }

  return (
    <main
      id="main-content"
      className="ll-view-enter mx-auto max-w-[900px] px-6 py-16"
    >
      <nav className="mb-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]">
        <Link href="/dashboard">{t('breadcrumbs.campaigns')}</Link> /{' '}
        <Link href={`/campaigns/${campaignId}`}>{campaign.title}</Link> /{' '}
        <b className="text-[var(--ink)]">
          {t('breadcrumbs.draft', { number: session.session_number })}
        </b>
      </nav>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
            {t('kicker', { number: session.session_number })}
          </p>
          <h1 className="mt-3 font-serif text-[38px] font-semibold leading-[1.04] tracking-[-0.03em] text-[var(--ink)]">
            {title}
          </h1>
          <p className="mt-3 text-base text-[var(--ink-2)]">
            {t.rich('subtitle', {
              scribe: (chunks) => (
                <span className="font-serif italic text-[var(--accent-deep)]">
                  {chunks}
                </span>
              ),
            })}
          </p>
        </div>
        <div className="flex flex-col justify-end gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(`/campaigns/${campaignId}`)}
          >
            {t('backCampaign')}
          </Button>
          <Button type="button" variant="secondary" onClick={copyAll}>
            {t('copy')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void saveAll()}
          >
            {t('saveChanges')}
          </Button>
          <Button
            type="button"
            variant="accent"
            onClick={() =>
              router.push(
                `/campaigns/${campaignId}/sessions/${sessionId}/export`
              )
            }
          >
            {t('exportPdf')}
          </Button>
        </div>
      </div>
      {error ? (
        <Notice className="mt-5" variant="error" ornament="⚠" role="alert">
          {error}
        </Notice>
      ) : null}
      <div className="mt-8 grid gap-8 llg:grid-cols-[1.5fr_1fr] llg:gap-10">
        <section className="space-y-4">
          {visibleSections.map((section, index) => (
            <article
              key={section.id}
              className="border-b border-dotted border-[var(--dotted)] pb-5"
            >
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="font-mono text-[11px] font-bold text-[var(--accent)]">
                  /{String(index + 1).padStart(2, '0')}
                </span>
                <h2 className="font-serif text-[19px] font-semibold text-[var(--ink)]">
                  {sectionLabel(section)}
                </h2>
                <OriginBadge origin={section.origin} />
                <div className="ml-auto flex gap-3">
                  {editing !== section.id ? (
                    <>
                      <button
                        type="button"
                        className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] underline"
                        onClick={() => {
                          setEditing(section.id)
                          setDraft(section.body)
                          setError(null)
                        }}
                      >
                        {te('edit')}
                      </button>
                      <button
                        type="button"
                        className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-3)] underline"
                        disabled={regeneratingSectionIds.has(section.id)}
                        onClick={() => void regenerateSectionAction(section.id)}
                      >
                        {regeneratingSectionIds.has(section.id)
                          ? t('regenerating')
                          : t('regenerate')}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
              {editing === section.id ? (
                <div className="mt-3">
                  <Textarea
                    aria-label={sectionLabel(section)}
                    rows={Math.max(3, section.body.split('\n').length + 1)}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    autoFocus
                  />
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void saveSection(section.id)}
                    >
                      {t('saveSectionChanges')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditing(null)}
                    >
                      {te('cancel')}
                    </Button>
                  </div>
                </div>
              ) : regeneratingSectionIds.has(section.id) ? (
                <div className="mt-3 flex items-center gap-2 py-2">
                  <span aria-hidden="true" className="ll-quill text-base">
                    ✒
                  </span>
                  <span className="ll-ellip font-mono text-[13px] text-[var(--ink-3)]">
                    {t('rewriting')}
                  </span>
                </div>
              ) : (
                <MarkdownBody className="mt-3">{section.body}</MarkdownBody>
              )}
            </article>
          ))}
          <article className="border-2 border-dashed border-[var(--dotted)] bg-[var(--paper)] p-5">
            <div className="flex items-baseline gap-3">
              <h2 className="font-serif text-[19px] font-semibold">
                {t('privateNotes')}
              </h2>
              <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.09em] text-[var(--mute)]">
                {t('excludedFromPdf')}
              </span>
              <button
                type="button"
                className="ml-auto font-mono text-[11px] font-semibold uppercase tracking-[0.1em] underline"
                onClick={() => setEditingNotes(true)}
              >
                {te('edit')}
              </button>
            </div>
            {editingNotes ? (
              <div className="mt-3">
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  autoFocus
                />
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setEditingNotes(false)
                      showToast(t('toast.notesSaved'))
                    }}
                  >
                    {te('saveChanges')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditingNotes(false)}
                  >
                    {te('cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-3 font-serif text-sm text-[var(--ink-2)]">
                {notes || t('privateNotesEmpty')}
              </p>
            )}
          </article>
        </section>
        <aside>
          <h2 className="font-serif text-[19px] font-semibold text-[var(--ink)]">
            {t('memoriesHeading')}
          </h2>
          <p className="mt-1 text-xs text-[var(--ink-3)]">
            {t('memoriesHelp')}
          </p>
          <div className="mt-3">
            {linkedMemories.map((memory) => {
              const sourceLabel = sourceSessionLabel(memory.source_session_id)
              return (
                <div
                  key={memory.id}
                  className="border-b border-dotted border-[var(--dotted)] py-3"
                >
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
                    {memoryTypeLabel(memory.type)}
                  </span>
                  <p className="mt-1 font-serif text-[13.5px] leading-relaxed text-[var(--ink)]">
                    {memory.content}
                  </p>
                  {sourceLabel ? (
                    <span className="text-[11px] text-[var(--ink-3)]">
                      {sourceLabel}
                    </span>
                  ) : null}
                </div>
              )
            })}
            {linkedMemories.length === 0 ? (
              <p className="border-b border-dotted border-[var(--dotted)] py-3 font-serif text-[13.5px] leading-relaxed text-[var(--ink-2)]">
                {t('memoriesEmpty')}
              </p>
            ) : null}
          </div>
          <hr className="my-5 border-t border-[var(--line)]" />
          <h2 className="font-serif text-[19px] font-semibold text-[var(--ink)]">
            {t('legend')}
          </h2>
          <div className="mt-3 grid gap-2 text-xs text-[var(--ink-2)]">
            <span>
              <OriginBadge origin="scribe" /> · {t('legendScribe')}
            </span>
            <span>
              <OriginBadge origin="edited" /> · {t('legendEdited')}
            </span>
            <span>
              <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.09em] text-[var(--mute)]">
                {t('excludedFromPdf')}
              </span>{' '}
              · {t('legendExcluded')}
            </span>
          </div>
        </aside>
      </div>
      {toast && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed bottom-5 right-5 z-50 border-2 border-[var(--border)] bg-[var(--paper)] px-4 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] shadow-[4px_4px_0_var(--shadow)]"
              role="status"
            >
              {toast}
            </div>,
            document.body
          )
        : null}
    </main>
  )
}
