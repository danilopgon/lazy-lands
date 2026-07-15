'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import type { ArcDraft } from '@/components/campaigns/arc-modal'
import type { FactionDraft } from '@/components/campaigns/faction-modal'
import type { NpcDraft } from '@/components/campaigns/npc-modal'
import type {
  ArcResponse,
  CampaignDetailResponse,
  FactionResponse,
  NpcResponse,
} from '@/lib/campaigns/schemas'
import type { MemoryFactResponse } from '@/lib/memory/schemas'
import type {
  GenerateSessionResponse,
  MemorySuggestion,
  RegisterSessionResponse,
  SectionId,
  SessionDetail,
  SessionResponse,
  UpdateSessionContent,
} from '@/lib/sessions/schemas'

import {
  DEMO_CAMPAIGN_ID,
  DEMO_GENERATED_SESSION_ID,
  demoCampaign,
  demoGeneratedSession,
  demoMemoryFacts,
  demoMemorySuggestions,
  demoSessions,
} from './fixtures'

/**
 * How long each simulated Scribe action "thinks" for. The delay exists purely
 * so the reused production loading states (quill takeover, saving labels,
 * stamps) actually get a chance to render — nothing is ever fetched.
 */
const DEMO_LATENCY_MS = 450

/** Alternate section bodies the demo "regenerate" swaps in, keyed by section id. */
const REGENERATED_SECTION_BODIES: Partial<Record<SectionId, string>> = {
  synopsis:
    'The truce was never meant to hold. As the party arrives at the Miners Exchange, they realize both guilds expected them to pick a side today — and Cryovain’s shadow makes neutrality a luxury no one can afford.',
  goal: 'Make the party choose who they empower with the anti-dragon plans, knowing every option closes a door somewhere else in Phandalin.',
  opening:
    'Snow ticks against the Exchange windows. Halia’s smile does not reach her eyes; across the room, a Crimson Blade cracks his knuckles. Someone has already decided how this ends.',
  beats:
    '- A forged ledger surfaces, implicating whichever faction the party trusts least.\n- Fibblestib’s warning turns out to be minutes, not days, ahead of disaster.\n- The north-road rider arrives wounded — Cryovain is closer than anyone feared.',
  encounters:
    'The parley itself is the encounter: a web of social checks where a single misread of Herman’s informant tips the room into drawn steel.',
  factions:
    'The Black Bear Guild overplays its hand; the Crimson Blades feign retreat to bait pursuit; the Zhentarim simply watch, tallying debts to call in later.',
  arcs: 'The stolen-plans arc forces a decision the party cannot walk back, while Cryovain’s pressure jumps from background threat to the reason the room can’t simply wait.',
}

/** The mutable slice of demo state that the reused views read and write. */
type DemoState = {
  campaign: CampaignDetailResponse
  sessions: SessionResponse[]
  memoryFacts: MemoryFactResponse[]
  suggestions: MemorySuggestion[]
  loggedSession: { sessionId: string; sessionNumber: number } | null
  generated: SessionDetail
}

/** The demo store surface: current state plus its simulated async actions. */
type DemoStore = DemoState & {
  saveWorldState: (worldState: string) => Promise<string>
  createNpc: (draft: NpcDraft) => Promise<void>
  updateNpc: (id: string, draft: NpcDraft) => Promise<void>
  deleteNpc: (id: string) => Promise<void>
  createFaction: (draft: FactionDraft) => Promise<void>
  updateFaction: (id: string, draft: FactionDraft) => Promise<void>
  deleteFaction: (id: string) => Promise<void>
  createArc: (draft: ArcDraft) => Promise<void>
  updateArc: (id: string, draft: ArcDraft) => Promise<void>
  deleteArc: (id: string) => Promise<void>
  logSession: (payload: {
    summary: string
    consequences?: string
  }) => Promise<RegisterSessionResponse>
  acceptSuggestion: (payload: {
    suggestion: MemorySuggestion
    content: string
  }) => Promise<void>
  retireMemory: (id: string) => Promise<void>
  generateSession: () => Promise<GenerateSessionResponse>
  saveSession: (payload: UpdateSessionContent) => Promise<SessionDetail>
  regenerateSection: (sectionId: SectionId) => Promise<SessionDetail>
}

const DemoStoreContext = createContext<DemoStore | null>(null)

/**
 * Resolve `value` after the shared demo latency so reused loading states show.
 *
 * @param {T} value - The value to resolve with.
 * @returns {Promise<T>} A promise resolving with `value` after the demo delay.
 * @template T - The resolved value type.
 */
function settle<T>(value: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), DEMO_LATENCY_MS)
  })
}

/**
 * Build the pristine starting state from the (schema-validated) fixtures.
 *
 * @returns {DemoState} A fresh demo state seeded from the fixtures.
 */
function initialState(): DemoState {
  return {
    campaign: demoCampaign,
    sessions: demoSessions,
    memoryFacts: demoMemoryFacts,
    suggestions: [],
    loggedSession: null,
    generated: demoGeneratedSession,
  }
}

/**
 * In-memory state + simulated actions for the public `/demo`. Everything lives
 * in React state for the lifetime of the tab; no API, Supabase, React Query, or
 * external call is ever made. Resetting is as simple as reloading the page.
 *
 * @param {object} root0 - Provider props.
 * @param {ReactNode} root0.children - The demo subtree that consumes the store.
 * @returns {React.ReactElement} The provider wrapping the demo subtree.
 */
export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(initialState)
  const idCounter = useRef(0)

  /**
   * Mint a stable, unique id for a locally-created demo entity.
   *
   * @param {string} prefix - A short entity prefix, e.g. "npc".
   * @returns {string} A unique demo id.
   */
  const nextId = useCallback((prefix: string) => {
    idCounter.current += 1
    return `demo-${prefix}-local-${idCounter.current}`
  }, [])

  const patchCampaign = useCallback(
    (patch: (campaign: CampaignDetailResponse) => CampaignDetailResponse) => {
      setState((current) => ({
        ...current,
        campaign: patch(current.campaign),
      }))
    },
    []
  )

  const saveWorldState = useCallback(
    async (worldState: string) => {
      patchCampaign((campaign) => ({ ...campaign, world_state: worldState }))
      return settle(worldState)
    },
    [patchCampaign]
  )

  const createNpc = useCallback(
    async (draft: NpcDraft) => {
      const npc: NpcResponse = {
        id: nextId('npc'),
        content_source: 'manual',
        ...draft,
      }
      patchCampaign((campaign) => ({
        ...campaign,
        npcs: [npc, ...campaign.npcs],
      }))
      return settle(undefined)
    },
    [nextId, patchCampaign]
  )

  const updateNpc = useCallback(
    async (id: string, draft: NpcDraft) => {
      patchCampaign((campaign) => ({
        ...campaign,
        npcs: campaign.npcs.map((npc) =>
          npc.id === id ? { ...npc, ...draft, content_source: 'edited' } : npc
        ),
      }))
      return settle(undefined)
    },
    [patchCampaign]
  )

  const deleteNpc = useCallback(
    async (id: string) => {
      patchCampaign((campaign) => ({
        ...campaign,
        npcs: campaign.npcs.filter((npc) => npc.id !== id),
      }))
      return settle(undefined)
    },
    [patchCampaign]
  )

  const createFaction = useCallback(
    async (draft: FactionDraft) => {
      const faction: FactionResponse = {
        id: nextId('faction'),
        content_source: 'manual',
        ...draft,
      }
      patchCampaign((campaign) => ({
        ...campaign,
        factions: [faction, ...campaign.factions],
      }))
      return settle(undefined)
    },
    [nextId, patchCampaign]
  )

  const updateFaction = useCallback(
    async (id: string, draft: FactionDraft) => {
      patchCampaign((campaign) => ({
        ...campaign,
        factions: campaign.factions.map((faction) =>
          faction.id === id
            ? { ...faction, ...draft, content_source: 'edited' }
            : faction
        ),
      }))
      return settle(undefined)
    },
    [patchCampaign]
  )

  const deleteFaction = useCallback(
    async (id: string) => {
      patchCampaign((campaign) => ({
        ...campaign,
        factions: campaign.factions.filter((faction) => faction.id !== id),
      }))
      return settle(undefined)
    },
    [patchCampaign]
  )

  const createArc = useCallback(
    async (draft: ArcDraft) => {
      const arc: ArcResponse = {
        id: nextId('arc'),
        content_source: 'manual',
        ...draft,
      }
      patchCampaign((campaign) => ({
        ...campaign,
        arcs: [arc, ...campaign.arcs],
      }))
      return settle(undefined)
    },
    [nextId, patchCampaign]
  )

  const updateArc = useCallback(
    async (id: string, draft: ArcDraft) => {
      patchCampaign((campaign) => ({
        ...campaign,
        arcs: campaign.arcs.map((arc) =>
          arc.id === id ? { ...arc, ...draft, content_source: 'edited' } : arc
        ),
      }))
      return settle(undefined)
    },
    [patchCampaign]
  )

  const deleteArc = useCallback(
    async (id: string) => {
      patchCampaign((campaign) => ({
        ...campaign,
        arcs: campaign.arcs.filter((arc) => arc.id !== id),
      }))
      return settle(undefined)
    },
    [patchCampaign]
  )

  const logSession = useCallback(
    async (payload: { summary: string; consequences?: string }) => {
      const sessionNumber =
        state.sessions.reduce(
          (max, session) => Math.max(max, session.session_number),
          0
        ) + 1
      const sessionId = nextId('session')
      const session: SessionResponse = {
        id: sessionId,
        session_number: sessionNumber,
        summary: payload.summary,
        consequences: payload.consequences?.trim()
          ? payload.consequences
          : null,
        has_generated_content: false,
        created_at: new Date().toISOString(),
      }
      const response: RegisterSessionResponse = {
        session_id: sessionId,
        session_number: sessionNumber,
        memory_suggestions: demoMemorySuggestions,
      }
      setState((current) => ({
        ...current,
        sessions: [...current.sessions, session],
        suggestions: demoMemorySuggestions,
        loggedSession: { sessionId, sessionNumber },
      }))
      return settle(response)
    },
    [nextId, state.sessions]
  )

  const acceptSuggestion = useCallback(
    async (payload: { suggestion: MemorySuggestion; content: string }) => {
      const fact: MemoryFactResponse = {
        id: nextId('memory'),
        campaign_id: DEMO_CAMPAIGN_ID,
        source_session_id: state.loggedSession?.sessionId ?? null,
        content: payload.content,
        type: payload.suggestion.type,
        importance: payload.suggestion.importance,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setState((current) => ({
        ...current,
        memoryFacts: [fact, ...current.memoryFacts],
      }))
      return settle(undefined)
    },
    [nextId, state.loggedSession]
  )

  const retireMemory = useCallback(async (id: string) => {
    setState((current) => ({
      ...current,
      memoryFacts: current.memoryFacts.filter((fact) => fact.id !== id),
    }))
    return settle(undefined)
  }, [])

  const generateSession = useCallback(async () => {
    const content = state.generated.generated_content
    const response: GenerateSessionResponse = {
      id: DEMO_GENERATED_SESSION_ID,
      session_number: state.generated.session_number,
      title: content?.title ?? 'The Scribe’s Proposal',
      sections: content?.sections ?? [],
      continuity_links: content?.continuity_links ?? [],
      trace_id: 'demo-trace',
    }
    return settle(response)
  }, [state.generated])

  const saveSession = useCallback(
    async (payload: UpdateSessionContent) => {
      let updated: SessionDetail = state.generated
      setState((current) => {
        updated = {
          ...current.generated,
          generated_content:
            payload.generated_content ?? current.generated.generated_content,
          summary:
            payload.summary !== undefined
              ? payload.summary
              : current.generated.summary,
          consequences:
            payload.consequences !== undefined
              ? payload.consequences
              : current.generated.consequences,
          updated_at: new Date().toISOString(),
        }
        return { ...current, generated: updated }
      })
      return settle(updated)
    },
    [state.generated]
  )

  const regenerateSection = useCallback(
    async (sectionId: SectionId) => {
      let updated: SessionDetail = state.generated
      setState((current) => {
        const content = current.generated.generated_content
        if (!content) {
          updated = current.generated
          return current
        }
        const variant = REGENERATED_SECTION_BODIES[sectionId]
        const sections = content.sections.map((section) =>
          section.id === sectionId && variant
            ? { ...section, body: variant, origin: 'scribe' as const }
            : section
        )
        updated = {
          ...current.generated,
          generated_content: { ...content, sections },
          updated_at: new Date().toISOString(),
        }
        return { ...current, generated: updated }
      })
      return settle(updated)
    },
    [state.generated]
  )

  const store = useMemo<DemoStore>(
    () => ({
      ...state,
      saveWorldState,
      createNpc,
      updateNpc,
      deleteNpc,
      createFaction,
      updateFaction,
      deleteFaction,
      createArc,
      updateArc,
      deleteArc,
      logSession,
      acceptSuggestion,
      retireMemory,
      generateSession,
      saveSession,
      regenerateSection,
    }),
    [
      state,
      saveWorldState,
      createNpc,
      updateNpc,
      deleteNpc,
      createFaction,
      updateFaction,
      deleteFaction,
      createArc,
      updateArc,
      deleteArc,
      logSession,
      acceptSuggestion,
      retireMemory,
      generateSession,
      saveSession,
      regenerateSection,
    ]
  )

  return (
    <DemoStoreContext.Provider value={store}>
      {children}
    </DemoStoreContext.Provider>
  )
}

/**
 * Access the demo store. Must be used within a {@link DemoProvider}.
 *
 * @returns {DemoStore} The current demo state and its simulated actions.
 */
export function useDemoStore(): DemoStore {
  const store = useContext(DemoStoreContext)
  if (!store) {
    throw new Error('useDemoStore must be used within a DemoProvider')
  }
  return store
}
