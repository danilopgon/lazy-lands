import { describe, expect, it } from 'vitest'

import {
  createMemoryFactRequestSchema,
  memoryFactResponseSchema,
} from '@/lib/memory/schemas'

describe('memory schemas (Block 7b type enum)', () => {
  it('accepts a create request with a valid Scribe type', () => {
    const result = createMemoryFactRequestSchema.parse({
      content: 'The guild remembers the arson.',
      type: 'consequence',
      importance: 'medium',
    })
    expect(result.type).toBe('consequence')
  })

  it('rejects a create request with an invented type', () => {
    expect(() =>
      createMemoryFactRequestSchema.parse({
        content: 'x',
        type: 'Reputation',
        importance: 'low',
      })
    ).toThrow()
  })

  it('accepts a create request without a type (manual note)', () => {
    const result = createMemoryFactRequestSchema.parse({
      content: 'A manual note.',
    })
    expect(result.type).toBeUndefined()
  })

  it('reads a legacy memory fact with a free-text type (lenient read)', () => {
    const result = memoryFactResponseSchema.parse({
      id: 'm-1',
      campaign_id: 'c-1',
      source_session_id: null,
      content: 'Halia now suspects the party of arson.',
      type: 'Story Arc Progress',
      importance: 'high',
      status: 'active',
      created_at: '2026-07-09T00:00:00Z',
      updated_at: '2026-07-09T00:00:00Z',
    })
    expect(result.type).toBe('Story Arc Progress')
  })
})
