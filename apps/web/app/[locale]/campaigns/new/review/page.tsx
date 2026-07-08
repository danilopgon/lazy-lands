'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { useTranslations } from 'next-intl'
import { useMutation } from '@tanstack/react-query'

import { Link, useRouter } from '@/i18n/navigation'

import { Button } from '@/components/ui/button'
import { LoadingScribe } from '@/components/ui/loading-scribe'
import { Notice } from '@/components/ui/notice'
import { createCampaign, CampaignApiError } from '@/lib/campaigns/api'
import {
  readExtractionDraft,
  clearExtractionDraft,
} from '@/lib/campaigns/draft-storage'
import type {
  CreateCampaignRequest,
  ContentSource,
} from '@/lib/campaigns/schemas'
import { EntitySection, type EntityField } from './entity-section'
import { EditableProse } from './editable-prose'

type NpcItem = {
  reviewId: string
  name: string
  description: string
  current_state: string
  motivation: string
  content_source: ContentSource
  [key: string]: string
}

type FactionItem = {
  reviewId: string
  name: string
  description: string
  current_stance: string
  goals: string
  content_source: ContentSource
  [key: string]: string
}

type ArcItem = {
  reviewId: string
  title: string
  description: string
  priority: string
  content_source: ContentSource
  [key: string]: string
}

type ReviewDraftState = {
  title: string
  description: string
  worldState: string
  // Carried from the new-campaign form through the draft; persisted verbatim
  // on the campaign (system required, tone optional).
  system: string
  tone: string | null
  // UI-only provenance flags — never sent to the backend. They flip the
  // "Scribe" badge to "Edited by you" once the DM revises a prose block.
  titleEdited: boolean
  descriptionEdited: boolean
  worldStateEdited: boolean
  npcs: NpcItem[]
  factions: FactionItem[]
  arcs: ArcItem[]
}

/**
 * Read the stored extraction draft (client-only) and shape it into the review
 * screen's state, assigning stable reviewIds. Returns null on the server or
 * when no draft is stored.
 * @returns {ReviewDraftState | null} The review state, or null when unavailable.
 */
function loadInitialDraft(): ReviewDraftState | null {
  if (typeof window === 'undefined') return null
  const storedDraft = readExtractionDraft()
  if (!storedDraft) return null

  return {
    title: storedDraft.title,
    description: storedDraft.description,
    worldState: storedDraft.world_state,
    system: storedDraft.system,
    tone: storedDraft.tone,
    titleEdited: false,
    descriptionEdited: false,
    worldStateEdited: false,
    npcs: storedDraft.npcs.map((npc, index) => ({
      reviewId: `npc-${index}`,
      ...npc,
    })) as NpcItem[],
    factions: storedDraft.factions.map((faction, index) => ({
      reviewId: `faction-${index}`,
      ...faction,
    })) as FactionItem[],
    arcs: storedDraft.arcs.map((arc, index) => ({
      reviewId: `arc-${index}`,
      ...arc,
    })) as ArcItem[],
  }
}

/**
 * Client-only state container for the review screen.
 * @param {object} root0 - The component props.
 * @param {ReviewDraftState} root0.initialDraft - The draft loaded from storage.
 * @returns {React.ReactElement} The review screen.
 */
function ReviewCampaignClient({
  initialDraft,
}: {
  initialDraft: ReviewDraftState
}) {
  const router = useRouter()
  const t = useTranslations('Campaigns')
  const errorT = useTranslations('Errors')
  const te = useTranslations('Entities')
  const [draft, setDraft] = useState(initialDraft)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const npcFields: EntityField<NpcItem>[] = [
    { key: 'name', label: te('fields.name'), placeholder: te('fields.name') },
    {
      key: 'description',
      label: te('fields.description'),
      placeholder: te('fields.description'),
      multiline: true,
    },
    {
      key: 'current_state',
      label: te('fields.currentState'),
      placeholder: te('fields.currentState'),
      multiline: true,
    },
    {
      key: 'motivation',
      label: te('fields.motivation'),
      placeholder: te('fields.motivation'),
      multiline: true,
    },
  ]
  const factionFields: EntityField<FactionItem>[] = [
    { key: 'name', label: te('fields.name'), placeholder: te('fields.name') },
    {
      key: 'description',
      label: te('fields.description'),
      placeholder: te('fields.description'),
      multiline: true,
    },
    {
      key: 'current_stance',
      label: te('fields.currentStance'),
      placeholder: te('fields.currentStance'),
      multiline: true,
    },
    {
      key: 'goals',
      label: te('fields.goals'),
      placeholder: te('fields.goals'),
      multiline: true,
    },
  ]
  const arcFields: EntityField<ArcItem>[] = [
    {
      key: 'title',
      label: te('fields.title'),
      placeholder: te('fields.title'),
    },
    {
      key: 'description',
      label: te('fields.description'),
      placeholder: te('fields.description'),
      multiline: true,
    },
  ]

  const mutation = useMutation({
    mutationFn: (payload: CreateCampaignRequest) => createCampaign(payload),
    onSuccess: (result) => {
      clearExtractionDraft()
      router.push(`/campaigns/${result.id}`)
    },
    onError: (err: unknown) => {
      setIsCreating(false)
      setSaveError(
        err instanceof CampaignApiError
          ? errorT(err.messageKey)
          : t('review.saveError')
      )
    },
  })

  /** Build the reviewed payload and submit it via `POST /campaigns`. */
  function handleConfirm() {
    setSaveError(null)
    setIsCreating(true)
    const payload: CreateCampaignRequest = {
      title: draft.title,
      description: draft.description,
      world_state: draft.worldState,
      system: draft.system,
      tone: draft.tone,
      npcs: draft.npcs.map(
        ({ name, description, current_state, motivation, content_source }) => ({
          name,
          description,
          current_state,
          motivation,
          content_source,
        })
      ),
      factions: draft.factions.map(
        ({ name, description, current_stance, goals, content_source }) => ({
          name,
          description,
          current_stance,
          goals,
          content_source,
        })
      ),
      arcs: draft.arcs.map(
        ({ title, description, priority, content_source }) => ({
          title,
          description,
          priority: (priority ||
            'medium') as CreateCampaignRequest['arcs'][number]['priority'],
          content_source,
        })
      ),
    }
    mutation.mutate(payload)
  }

  // Persisting the campaign runs the same quill takeover as the extraction step
  // — the animation covers the create round-trip so the screen never looks stuck.
  if (isCreating) {
    return (
      <main id="main-content" className="mx-auto max-w-[820px] px-6 py-16">
        <LoadingScribe
          title={t('review.loadingTitle')}
          caption={t('review.loadingCaption')}
        />
      </main>
    )
  }

  const scribeItemCount =
    3 + draft.npcs.length + draft.factions.length + draft.arcs.length

  return (
    <main id="main-content" className="mx-auto max-w-[820px] px-6 py-16">
      <nav className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-2)]">
        <Link className="hover:text-[var(--accent-deep)]" href="/dashboard">
          {t('breadcrumbRoot')}
        </Link>{' '}
        / <Link href="/campaigns/new">{t('review.breadcrumbNew')}</Link> /{' '}
        <span className="text-[var(--ink)]">
          {t('review.breadcrumbReview')}
        </span>
      </nav>
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
        {t('review.step')}
      </p>
      <h1 className="mt-3 font-serif text-[38px] font-semibold leading-[1.04] tracking-[-0.03em] text-[var(--ink)]">
        {t('review.title')}
      </h1>
      <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-[var(--ink-2)]">
        {t('review.subtitle')}
      </p>

      <Notice className="mt-8" variant="scribe" ornament="✦">
        {t.rich('review.scribeNotice', {
          count: scribeItemCount,
          b: (chunks) => <strong>{chunks}</strong>,
        })}
      </Notice>

      <EditableProse
        label={t('review.titleLabel')}
        value={draft.title}
        edited={draft.titleEdited}
        onSave={(title) =>
          setDraft((current) => ({ ...current, title, titleEdited: true }))
        }
        testId="prose-title"
      />
      <EditableProse
        label={t('review.descriptionLabel')}
        value={draft.description}
        edited={draft.descriptionEdited}
        onSave={(description) =>
          setDraft((current) => ({
            ...current,
            description,
            descriptionEdited: true,
          }))
        }
        multiline
        rows={3}
        testId="prose-description"
      />
      <EditableProse
        label={t('review.worldStateLabel')}
        value={draft.worldState}
        edited={draft.worldStateEdited}
        onSave={(worldState) =>
          setDraft((current) => ({
            ...current,
            worldState,
            worldStateEdited: true,
          }))
        }
        multiline
        rows={4}
        testId="prose-world"
      />

      <EntitySection<NpcItem>
        title={t('review.npcsSection')}
        addLabel={t('review.npcAdd')}
        emptyHint={t('review.npcEmpty')}
        items={draft.npcs}
        fields={npcFields}
        onChange={(npcs) => setDraft((current) => ({ ...current, npcs }))}
        testId="npc"
        extraDefaults={{ current_state: '', motivation: '' }}
      />

      <EntitySection<FactionItem>
        title={t('review.factionsSection')}
        addLabel={t('review.factionAdd')}
        emptyHint={t('review.factionEmpty')}
        items={draft.factions}
        fields={factionFields}
        onChange={(factions) =>
          setDraft((current) => ({ ...current, factions }))
        }
        testId="faction"
        extraDefaults={{ current_stance: '', goals: '' }}
      />

      <EntitySection<ArcItem>
        title={t('review.arcsSection')}
        addLabel={t('review.arcAdd')}
        emptyHint={t('review.arcEmpty')}
        items={draft.arcs}
        fields={arcFields}
        onChange={(arcs) => setDraft((current) => ({ ...current, arcs }))}
        testId="arc"
        extraDefaults={{ priority: 'medium' }}
      />

      {saveError && (
        <p
          role="alert"
          className="mt-6 border-2 border-[var(--danger)] bg-[var(--danger-wash)] p-3 font-mono text-xs text-[var(--danger)]"
        >
          {saveError}
        </p>
      )}

      <div className="mt-8 flex justify-end gap-3 border-t-2 border-[var(--border)] pt-6">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push('/campaigns/new')}
        >
          {t('review.back')}
        </Button>
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={isCreating || mutation.isPending}
        >
          {isCreating || mutation.isPending
            ? t('review.creating')
            : t('review.confirm')}
        </Button>
      </div>
    </main>
  )
}

/** `/campaigns/new/review` — mounted shell that avoids sessionStorage prerender access. */
/**
 * Read the sessionStorage draft through `useSyncExternalStore` so the server
 * (and the first client/hydration render) see `undefined` while the browser
 * reads the real value on the next render — no sessionStorage access during
 * render, no hydration mismatch, and no setState inside an effect. The snapshot
 * is cached per instance so its reference stays stable across renders.
 *
 * @returns {ReviewDraftState | null | undefined} `undefined` before the draft
 *   is resolved, then the stored draft or `null` when none exists.
 */
function useStoredDraft(): ReviewDraftState | null | undefined {
  const cache = useRef<{ loaded: boolean; value: ReviewDraftState | null }>({
    loaded: false,
    value: null,
  })

  const getSnapshot = useCallback((): ReviewDraftState | null => {
    if (!cache.current.loaded) {
      cache.current.value = loadInitialDraft()
      cache.current.loaded = true
    }
    return cache.current.value
  }, [])

  const getServerSnapshot = useCallback((): undefined => undefined, [])
  const subscribe = useCallback(() => () => {}, [])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/**
 * Review screen route: loads the stored draft and renders the client container,
 * redirecting to `/campaigns/new` when there is no draft.
 * @returns {React.ReactElement | null} The review screen, or null while redirecting.
 */
export default function ReviewCampaignPage() {
  const router = useRouter()
  const initialDraft = useStoredDraft()

  // Redirect from an effect, never during render: calling router.push() while
  // rendering runs the App Router's history code, which touches the bare
  // `location` global and throws `ReferenceError: location is not defined`
  // during static prerendering (Node has no `location`).
  useEffect(() => {
    if (initialDraft === null) {
      router.push('/campaigns/new')
    }
  }, [initialDraft, router])

  if (!initialDraft) {
    return null
  }

  return <ReviewCampaignClient initialDraft={initialDraft} />
}
