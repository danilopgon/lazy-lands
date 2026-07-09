import { describe, expect, it } from 'vitest'

import {
  registerSessionRequestSchema,
  registerSessionResponseSchema,
  sessionResponseSchema,
} from '@/lib/sessions/schemas'

describe('sessions schemas (Block 7a frontend contract)', () => {
  it('accepts a valid register-session request with only summary', () => {
    const result = registerSessionRequestSchema.parse({
      summary: 'The party tracked the smugglers to the warehouse district.',
    })
    expect(result.summary).toContain('smugglers')
    expect(result.consequences).toBeUndefined()
  })

  it('accepts summary + consequences', () => {
    const result = registerSessionRequestSchema.parse({
      summary: 'Session happened.',
      consequences: 'The guild lost their cache.',
    })
    expect(result.consequences).toBe('The guild lost their cache.')
  })

  it('rejects an empty summary', () => {
    expect(() =>
      registerSessionRequestSchema.parse({ summary: '   ' })
    ).toThrow()
  })

  it('parses a full RegisterSessionResponse with memory suggestions', () => {
    const result = registerSessionResponseSchema.parse({
      session_id: 'sess-1',
      session_number: 3,
      memory_suggestions: [
        {
          content: 'Halia now suspects the party of arson.',
          type: 'tension',
          importance: 'high',
          reason: 'Directly affects future NPC dialogue.',
          related: ['npc-halia'],
        },
      ],
    })
    expect(result.session_number).toBe(3)
    expect(result.memory_suggestions).toHaveLength(1)
    expect(result.memory_suggestions[0].type).toBe('tension')
  })

  it('rejects a memory suggestion with an invented type', () => {
    expect(() =>
      registerSessionResponseSchema.parse({
        session_id: 'sess-1',
        session_number: 1,
        memory_suggestions: [
          {
            content: 'x',
            type: 'npc_state',
            importance: 'high',
            reason: 'y',
            related: [],
          },
        ],
      })
    ).toThrow()
  })

  it('parses a RegisterSessionResponse with an empty degrade-to-empty suggestions array', () => {
    const result = registerSessionResponseSchema.parse({
      session_id: 'sess-2',
      session_number: 1,
      memory_suggestions: [],
    })
    expect(result.memory_suggestions).toEqual([])
  })

  it('parses a SessionResponse history row with nullable fields', () => {
    const result = sessionResponseSchema.parse({
      id: 'sess-1',
      session_number: 1,
      summary: null,
      consequences: null,
      created_at: null,
    })
    expect(result.session_number).toBe(1)
  })
})
