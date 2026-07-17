import { describe, expect, it } from 'vitest'

import {
  generateSessionRequestSchema,
  generateSessionResponseSchema,
  generatedContentSchema,
  sessionDetailSchema,
  updateSessionContentSchema,
} from '@/lib/sessions/schemas'

/** A minimal, valid `GET /sessions/{id}` payload for status-parsing cases. */
function sessionDetailRow() {
  return {
    id: 'session-8',
    campaign_id: 'camp-1',
    session_number: 8,
    summary: 'Halia calls in the debt.',
    consequences: null,
    generated_content: {
      sections: [
        { id: 'synopsis', label: 'Synopsis', body: 'Draft', origin: 'scribe' },
      ],
    },
    trace_json: null,
    created_at: '2026-07-10T10:00:00Z',
    updated_at: '2026-07-10T10:00:00Z',
  }
}

describe('Block 8 session generation schemas', () => {
  it('trims optional direction fields and preserves server defaults', () => {
    const result = generateSessionRequestSchema.parse({
      goal: ' Bring Herman back ',
      additional_instructions: '   ',
    })

    expect(result.goal).toBe('Bring Herman back')
    expect(result.tone).toBe('Keep current, low-magic intrigue')
    expect(result.pace).toBe('Balanced')
    expect(result.difficulty).toBe('Standard')
    expect(result.additional_instructions).toBeNull()
  })

  it('parses generated-session creation responses with 7 canonical sections', () => {
    const result = generateSessionResponseSchema.parse({
      id: 'session-8',
      session_number: 8,
      title: 'The Quiet Ledger',
      sections: [
        'synopsis',
        'goal',
        'opening',
        'beats',
        'encounters',
        'factions',
        'arcs',
      ].map((id) => ({
        id,
        label: id,
        body: 'Draft.',
        origin: 'scribe' as const,
      })),
      continuity_links: [
        { memory_fact_id: 'mem-1', relevance: 'Halia favor split.' },
      ],
      trace_id: 'session-8',
    })

    expect(result.continuity_links).toHaveLength(1)
    expect(result.sections).toHaveLength(7)
    expect(result.title).toBe('The Quiet Ledger')
  })

  it('rejects generated content with invented origins', () => {
    expect(() =>
      generatedContentSchema.parse({
        sections: [
          { id: 'synopsis', label: 'Synopsis', body: 'Draft', origin: 'llm' },
        ],
      })
    ).toThrow()
  })

  it('requires at least one field for update requests', () => {
    expect(() => updateSessionContentSchema.parse({})).toThrow()
    const result = updateSessionContentSchema.parse({ summary: null })
    expect(result.summary).toBeNull()
  })

  it('parses a session detail row with generated content and trace metadata', () => {
    const result = sessionDetailSchema.parse({
      id: 'session-8',
      campaign_id: 'camp-1',
      session_number: 8,
      summary: 'Halia calls in the debt.',
      consequences: null,
      generated_content: {
        continuity_links: [
          { memory_fact_id: 'mem-1', relevance: 'Halia split favor.' },
        ],
        sections: [
          {
            id: 'synopsis',
            label: 'Synopsis',
            body: 'Draft',
            origin: 'scribe',
          },
        ],
      },
      trace_json: {
        provider: 'fake',
        model: 'test',
        prompt_version: 'generate_session_v1',
      },
      created_at: '2026-07-10T10:00:00Z',
      updated_at: '2026-07-10T10:00:00Z',
    })

    expect(result.generated_content?.sections[0].origin).toBe('scribe')
    expect(result.generated_content?.continuity_links?.[0].memory_fact_id).toBe(
      'mem-1'
    )
  })

  it.each([
    ['draft', 'draft'],
    ['registered', 'registered'],
  ])(
    'keeps the %s lifecycle status on a session detail row',
    (stored, expected) => {
      const result = sessionDetailSchema.parse({
        ...sessionDetailRow(),
        status: stored,
      })

      expect(result.status).toBe(expected)
    }
  )

  it.each([
    ['absent', {}],
    ['unrecognized', { status: 'archived' }],
    ['null', { status: null }],
  ])(
    'falls back to registered when the session detail status is %s',
    (_case, override) => {
      // Never 'draft': the detail screen titles a draft as an unplayed
      // proposal, so an unknown status must degrade to the neutral, recorded
      // presentation rather than claim the DM's real record is discardable.
      const result = sessionDetailSchema.parse({
        ...sessionDetailRow(),
        ...override,
      })

      expect(result.status).toBe('registered')
    }
  )

  it('preserves unknown generated content fields so section updates do not erase them', () => {
    const result = generatedContentSchema.parse({
      sections: [
        {
          id: 'synopsis',
          label: 'Synopsis',
          body: 'Draft',
          origin: 'scribe',
        },
      ],
      continuity_links: [
        { memory_fact_id: 'mem-1', relevance: 'Halia split favor.' },
      ],
      future_backend_field: { keep: true },
    })

    expect(result).toMatchObject({
      future_backend_field: { keep: true },
      continuity_links: [
        { memory_fact_id: 'mem-1', relevance: 'Halia split favor.' },
      ],
    })
  })
})
