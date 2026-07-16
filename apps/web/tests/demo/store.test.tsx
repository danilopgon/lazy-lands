import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DemoProvider, useDemoStore } from '@/lib/demo/store'
import { fixturesByLocale } from '@/lib/demo/fixtures'

/**
 * Render the demo store hook wrapped in its provider.
 *
 * @returns {ReturnType<typeof renderHook>} The rendered hook handle.
 */
function renderStore() {
  return renderHook(() => useDemoStore(), { wrapper: DemoProvider })
}

describe('demo store', () => {
  it('creates, edits and deletes an NPC locally', async () => {
    const { result } = renderStore()
    const startCount = result.current.campaign.npcs.length

    await act(async () => {
      await result.current.createNpc({
        name: 'Sister Garaele',
        description: null,
        current_state: null,
        motivation: null,
      })
    })
    expect(result.current.campaign.npcs.length).toBe(startCount + 1)
    const created = result.current.campaign.npcs[0]
    expect(created.name).toBe('Sister Garaele')
    expect(created.content_source).toBe('manual')

    await act(async () => {
      await result.current.updateNpc(created.id, {
        name: 'Sister Garaele (Harper)',
        description: null,
        current_state: null,
        motivation: null,
      })
    })
    expect(
      result.current.campaign.npcs.find((npc) => npc.id === created.id)?.name
    ).toBe('Sister Garaele (Harper)')

    await act(async () => {
      await result.current.deleteNpc(created.id)
    })
    expect(result.current.campaign.npcs.length).toBe(startCount)
  })

  it('saves the world state locally', async () => {
    const { result } = renderStore()
    await act(async () => {
      await result.current.saveWorldState('A new dawn breaks over Phandalin.')
    })
    expect(result.current.campaign.world_state).toBe(
      'A new dawn breaks over Phandalin.'
    )
  })

  it('logs a session and surfaces Scribe suggestions', async () => {
    const { result } = renderStore()
    const startSessions = result.current.sessions.length

    await act(async () => {
      await result.current.logSession({
        summary: 'The party reached the keep.',
      })
    })

    expect(result.current.sessions.length).toBe(startSessions + 1)
    expect(result.current.suggestions.length).toBeGreaterThan(0)
    expect(result.current.loggedSession).not.toBeNull()
  })

  it('accepts a suggestion into active memory and retires a memory', async () => {
    const { result } = renderStore()
    const startFacts = result.current.memoryFacts.length
    const suggestion = {
      content: 'The keep is compromised.',
      type: 'secret' as const,
      importance: 'high' as const,
      reason: 'It reframes the next infiltration.',
      related: ['Black Bear Guild'],
    }

    await act(async () => {
      await result.current.acceptSuggestion({
        suggestion,
        content: suggestion.content,
      })
    })
    expect(result.current.memoryFacts.length).toBe(startFacts + 1)
    const added = result.current.memoryFacts[0]
    expect(added.content).toBe('The keep is compromised.')

    await act(async () => {
      await result.current.retireMemory(added.id)
    })
    expect(
      result.current.memoryFacts.some((fact) => fact.id === added.id)
    ).toBe(false)
  })

  it('logs a session with suggestions pre-keyed with stable ids', async () => {
    const { result } = renderStore()

    await act(async () => {
      await result.current.logSession({
        summary: 'The party reached the keep.',
      })
    })

    expect(result.current.suggestions.length).toBeGreaterThan(0)
    for (const suggestion of result.current.suggestions) {
      expect(typeof suggestion.id).toBe('string')
      expect(suggestion.id.length).toBeGreaterThan(0)
    }
  })

  it('resolveSuggestion synchronously removes the entry from state.suggestions', async () => {
    const { result } = renderStore()

    await act(async () => {
      await result.current.logSession({
        summary: 'The party reached the keep.',
      })
    })

    const [first, ...rest] = result.current.suggestions
    expect(first).toBeDefined()

    act(() => {
      result.current.resolveSuggestion(first.id)
    })

    expect(result.current.suggestions.map((s) => s.id)).toEqual(
      rest.map((s) => s.id)
    )
    expect(result.current.suggestions.some((s) => s.id === first.id)).toBe(
      false
    )
  })

  it('creates, edits and deletes a faction locally', async () => {
    const { result } = renderStore()
    const startCount = result.current.campaign.factions.length

    await act(async () => {
      await result.current.createFaction({
        name: 'The Silver Hand',
        description: null,
        current_stance: null,
        goals: null,
      })
    })
    expect(result.current.campaign.factions.length).toBe(startCount + 1)
    const created = result.current.campaign.factions[0]
    expect(created.name).toBe('The Silver Hand')
    expect(created.content_source).toBe('manual')

    await act(async () => {
      await result.current.updateFaction(created.id, {
        name: 'The Silver Hand (Reformed)',
        description: null,
        current_stance: null,
        goals: null,
      })
    })
    expect(
      result.current.campaign.factions.find(
        (faction) => faction.id === created.id
      )?.name
    ).toBe('The Silver Hand (Reformed)')
    expect(
      result.current.campaign.factions.find(
        (faction) => faction.id === created.id
      )?.content_source
    ).toBe('edited')

    await act(async () => {
      await result.current.deleteFaction(created.id)
    })
    expect(result.current.campaign.factions.length).toBe(startCount)
  })

  it('creates, edits and deletes an arc locally', async () => {
    const { result } = renderStore()
    const startCount = result.current.campaign.arcs.length

    await act(async () => {
      await result.current.createArc({
        title: 'The Lost Caravan',
        description: null,
        priority: 'medium',
        status: 'active',
      })
    })
    expect(result.current.campaign.arcs.length).toBe(startCount + 1)
    const created = result.current.campaign.arcs[0]
    expect(created.title).toBe('The Lost Caravan')
    expect(created.content_source).toBe('manual')

    await act(async () => {
      await result.current.updateArc(created.id, {
        title: 'The Lost Caravan (Found)',
        description: null,
        priority: 'medium',
        status: 'resolved',
      })
    })
    const updated = result.current.campaign.arcs.find(
      (arc) => arc.id === created.id
    )
    expect(updated?.title).toBe('The Lost Caravan (Found)')
    expect(updated?.status).toBe('resolved')
    expect(updated?.content_source).toBe('edited')

    await act(async () => {
      await result.current.deleteArc(created.id)
    })
    expect(result.current.campaign.arcs.length).toBe(startCount)
  })

  it('saves session content in isolation', async () => {
    const { result } = renderStore()

    let updated
    await act(async () => {
      updated = await result.current.saveSession({
        summary: 'A revised summary of the session.',
        consequences: 'The party now owes the guild a favor.',
      })
    })

    expect(updated).toBeDefined()
    expect(result.current.generated.summary).toBe(
      'A revised summary of the session.'
    )
    expect(result.current.generated.consequences).toBe(
      'The party now owes the guild a favor.'
    )
  })

  it('generates a draft and regenerates one of its sections', async () => {
    const { result } = renderStore()

    let sectionCount = 0
    await act(async () => {
      const generated = await result.current.generateSession()
      sectionCount = generated.sections.length
    })
    expect(sectionCount).toBe(7)

    const before = result.current.generated.generated_content?.sections.find(
      (section) => section.id === 'synopsis'
    )?.body

    await act(async () => {
      await result.current.regenerateSection('synopsis')
    })

    const after = result.current.generated.generated_content?.sections.find(
      (section) => section.id === 'synopsis'
    )?.body
    expect(after).not.toBe(before)
  })

  it('regenerates a section with the locale-specific body under the es fixtures', async () => {
    const EsWrapper = ({ children }: { children: ReactNode }) => (
      <DemoProvider initialFixtures={fixturesByLocale.es}>
        {children}
      </DemoProvider>
    )
    const { result } = renderHook(() => useDemoStore(), { wrapper: EsWrapper })

    const before = result.current.generated.generated_content?.sections.find(
      (section) => section.id === 'synopsis'
    )?.body

    await act(async () => {
      await result.current.regenerateSection('synopsis')
    })

    const after = result.current.generated.generated_content?.sections.find(
      (section) => section.id === 'synopsis'
    )?.body
    expect(after).not.toBe(before)
    expect(after).toBe(fixturesByLocale.es.regeneratedSections.synopsis)
    // The Spanish draft must never be regenerated with the English variant.
    expect(after).not.toBe(fixturesByLocale.en.regeneratedSections.synopsis)
  })

  it('derives the generated draft session number sequentially after logging', async () => {
    const { result } = renderStore()

    let loggedNumber = 0
    await act(async () => {
      const logged = await result.current.logSession({
        summary: 'The party reached the keep.',
      })
      loggedNumber = logged.session_number
    })

    // A later render (mirroring log → navigate → prepare → generate) reads the
    // committed session history, so the draft number stays sequential.
    let generatedNumber = 0
    await act(async () => {
      const generated = await result.current.generateSession()
      generatedNumber = generated.session_number
    })

    // Logging creates session N; the next generated draft must be N + 1.
    expect(generatedNumber).toBe(loggedNumber + 1)
    expect(result.current.generated.session_number).toBe(loggedNumber + 1)
  })
})
