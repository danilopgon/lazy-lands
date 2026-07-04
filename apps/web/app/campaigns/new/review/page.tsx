'use client'

import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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

type NpcItem = {
  name: string
  description: string
  current_state: string
  motivation: string
  content_source: ContentSource
  [key: string]: string
}

type FactionItem = {
  name: string
  description: string
  current_stance: string
  goals: string
  content_source: ContentSource
  [key: string]: string
}

type ArcItem = {
  title: string
  description: string
  priority: string
  content_source: ContentSource
  [key: string]: string
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

/**
 * `/campaigns/new/review` — the DM's editable review of the Scribe's
 * extraction proposal (CUI-002).
 *
 * Reads the extracted payload from client-side storage (no server-side
 * draft, NFR-CUI-2), lets the DM edit/remove/add NPCs, factions, and arcs,
 * then persists the reviewed payload via `POST /campaigns`.
 *
 * @returns {React.ReactElement} The review screen.
 */
export default function ReviewCampaignPage() {
  const router = useRouter()
  // Read the extraction draft synchronously during initial render
  // (sessionStorage is a synchronous API). The effect below only runs
  // the redirect when no draft exists — it does not call setState.
  const draft = readExtractionDraft()
  const [title] = useState(draft?.title ?? '')
  const [description] = useState(draft?.description ?? '')
  const [worldState, setWorldState] = useState(draft?.world_state ?? '')
  const [npcs, setNpcs] = useState<NpcItem[]>((draft?.npcs as NpcItem[]) ?? [])
  const [factions, setFactions] = useState<FactionItem[]>(
    (draft?.factions as FactionItem[]) ?? []
  )
  const [arcs, setArcs] = useState<ArcItem[]>(
    (draft?.arcs.map((arc) => ({ ...arc })) as ArcItem[]) ?? []
  )
  const [saveError, setSaveError] = useState<string | null>(null)

  // Redirect when no draft exists — this is a side-effect, kept in useEffect.
  useEffect(() => {
    if (!draft) {
      router.push('/campaigns/new')
    }
  }, [draft, router])

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
      title,
      description,
      world_state: worldState,
      npcs: npcs.map(
        ({
          name,
          description: d,
          current_state,
          motivation,
          content_source,
        }) => ({
          name,
          description: d,
          current_state,
          motivation,
          content_source,
        })
      ),
      factions: factions.map(
        ({ name, description: d, current_stance, goals, content_source }) => ({
          name,
          description: d,
          current_stance,
          goals,
          content_source,
        })
      ),
      arcs: arcs.map(
        ({ title: t, description: d, priority, content_source }) => ({
          title: t,
          description: d,
          priority: (priority ||
            'medium') as CreateCampaignRequest['arcs'][number]['priority'],
          content_source,
        })
      ),
    }
    mutation.mutate(payload)
  }

  return (
    <main id="main-content" className="mx-auto max-w-[820px] px-6 py-16">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
        Step 2 of 2 · Review before it&apos;s real
      </p>
      <h1 className="mt-3 font-serif text-4xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
        What the Scribe found
      </h1>
      <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-[var(--ink-2)]">
        Every item below is a proposal, not canon. Edit anything, remove
        what&apos;s wrong, add what&apos;s missing, then confirm to create your
        campaign.
      </p>

      <section className="mt-8 space-y-4">
        <div>
          <h2 className="font-serif text-lg font-semibold text-[var(--ink)]">
            {title}
          </h2>
        </div>
        <div>
          <p className="text-[var(--ink-2)]">{description}</p>
        </div>
        <div>
          <Textarea
            aria-label="World state"
            value={worldState}
            onChange={(e) => setWorldState(e.target.value)}
            rows={4}
          />
        </div>
      </section>

      <EntitySection<NpcItem>
        title="NPCs detected"
        singular="NPC"
        items={npcs}
        fields={NPC_FIELDS}
        onChange={setNpcs}
        testId="npc"
        extraDefaults={{
          current_state: '',
          motivation: '',
        }}
      />

      <EntitySection<FactionItem>
        title="Factions detected"
        singular="faction"
        items={factions}
        fields={FACTION_FIELDS}
        onChange={setFactions}
        testId="faction"
        extraDefaults={{
          current_stance: '',
          goals: '',
        }}
      />

      <EntitySection<ArcItem>
        title="Open arcs detected"
        singular="arc"
        items={arcs}
        fields={ARC_FIELDS}
        onChange={setArcs}
        testId="arc"
        extraDefaults={{ priority: 'medium' }}
      />

      {saveError && (
        <p role="alert" className="mt-6 text-sm text-[var(--danger)]">
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
