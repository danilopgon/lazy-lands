'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

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
  // UI-only provenance flags — never sent to the backend. They flip the
  // "Scribe" badge to "Edited by you" once the DM revises a prose block.
  titleEdited: boolean
  descriptionEdited: boolean
  worldStateEdited: boolean
  npcs: NpcItem[]
  factions: FactionItem[]
  arcs: ArcItem[]
}

const NPC_FIELDS: EntityField<NpcItem>[] = [
  { key: 'name', label: 'Name', placeholder: 'Name' },
  { key: 'description', label: 'Description', placeholder: 'Description' },
  {
    key: 'current_state',
    label: 'Current state',
    placeholder: 'Current state',
  },
  { key: 'motivation', label: 'Motivation', placeholder: 'Motivation' },
]

const FACTION_FIELDS: EntityField<FactionItem>[] = [
  { key: 'name', label: 'Name', placeholder: 'Name' },
  { key: 'description', label: 'Description', placeholder: 'Description' },
  {
    key: 'current_stance',
    label: 'Current stance',
    placeholder: 'Current stance',
  },
  { key: 'goals', label: 'Goals', placeholder: 'Goals' },
]

const ARC_FIELDS: EntityField<ArcItem>[] = [
  { key: 'title', label: 'Title', placeholder: 'Title' },
  { key: 'description', label: 'Description', placeholder: 'Description' },
]

function loadInitialDraft(): ReviewDraftState | null {
  if (typeof window === 'undefined') return null
  const storedDraft = readExtractionDraft()
  if (!storedDraft) return null

  return {
    title: storedDraft.title,
    description: storedDraft.description,
    worldState: storedDraft.world_state,
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

/** Client-only state container for the review screen. */
function ReviewCampaignClient({
  initialDraft,
}: {
  initialDraft: ReviewDraftState
}) {
  const router = useRouter()
  const [draft, setDraft] = useState(initialDraft)
  const [saveError, setSaveError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (payload: CreateCampaignRequest) => createCampaign(payload),
    onSuccess: (result) => {
      clearExtractionDraft()
      router.push(`/campaigns/${result.id}`)
    },
    onError: (err: unknown) => {
      setSaveError(
        err instanceof CampaignApiError
          ? err.message
          : 'Unable to save this campaign right now. Please try again.'
      )
    },
  })

  /** Build the reviewed payload and submit it via `POST /campaigns`. */
  function handleConfirm() {
    setSaveError(null)
    const payload: CreateCampaignRequest = {
      title: draft.title,
      description: draft.description,
      world_state: draft.worldState,
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
  if (mutation.isPending) {
    return (
      <main id="main-content" className="mx-auto max-w-[820px] px-6 py-16">
        <LoadingScribe
          title="Binding your chronicle"
          caption="Saving the world state, NPCs, factions and arcs you confirmed"
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
          Campaigns
        </Link>{' '}
        / <Link href="/campaigns/new">New campaign</Link> /{' '}
        <span className="text-[var(--ink)]">Review</span>
      </nav>
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
        Step 2 of 2 · Review before it&apos;s real
      </p>
      <h1 className="mt-3 font-serif text-[38px] font-semibold leading-[1.04] tracking-[-0.03em] text-[var(--ink)]">
        What the Scribe found
      </h1>
      <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-[var(--ink-2)]">
        Every item below is a proposal, not canon. Edit anything, remove
        what&apos;s wrong, add what&apos;s missing, then confirm to create your
        campaign.
      </p>

      <Notice className="mt-8" variant="scribe" ornament="✦">
        The Scribe drafted <strong>{scribeItemCount} items</strong> from your
        notes. They stay marked as the Scribe&apos;s until you edit them.
      </Notice>

      <EditableProse
        label="Campaign title"
        value={draft.title}
        edited={draft.titleEdited}
        onSave={(title) =>
          setDraft((current) => ({ ...current, title, titleEdited: true }))
        }
        testId="prose-title"
      />
      <EditableProse
        label="Campaign description"
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
        label="World state"
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
        title="NPCs detected"
        singular="NPC"
        items={draft.npcs}
        fields={NPC_FIELDS}
        onChange={(npcs) => setDraft((current) => ({ ...current, npcs }))}
        testId="npc"
        extraDefaults={{ current_state: '', motivation: '' }}
      />

      <EntitySection<FactionItem>
        title="Factions detected"
        singular="faction"
        items={draft.factions}
        fields={FACTION_FIELDS}
        onChange={(factions) =>
          setDraft((current) => ({ ...current, factions }))
        }
        testId="faction"
        extraDefaults={{ current_stance: '', goals: '' }}
      />

      <EntitySection<ArcItem>
        title="Open arcs detected"
        singular="arc"
        items={draft.arcs}
        fields={ARC_FIELDS}
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
          Back
        </Button>
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Creating...' : 'Confirm & create campaign'}
        </Button>
      </div>
    </main>
  )
}

/** `/campaigns/new/review` — mounted shell that avoids sessionStorage prerender access. */
export default function ReviewCampaignPage() {
  const router = useRouter()
  const [initialDraft] = useState(loadInitialDraft)

  // Redirect from an effect, never during render: calling router.push() while
  // rendering runs the App Router's history code, which touches the bare
  // `location` global and throws `ReferenceError: location is not defined`
  // during static prerendering (Node has no `location`).
  useEffect(() => {
    if (!initialDraft) {
      router.push('/campaigns/new')
    }
  }, [initialDraft, router])

  if (!initialDraft) {
    return null
  }

  return <ReviewCampaignClient initialDraft={initialDraft} />
}
