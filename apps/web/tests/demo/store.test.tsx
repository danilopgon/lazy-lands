import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DemoProvider, useDemoStore } from '@/lib/demo/store'

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
})
