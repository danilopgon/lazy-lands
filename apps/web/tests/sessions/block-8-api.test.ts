import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }))

vi.mock('@/lib/api', () => ({ apiFetch: mockApiFetch }))

import {
  generateSession,
  getSession,
  SessionApiError,
  SessionCampaignNotFoundError,
  SessionValidationError,
  updateSessionContent,
} from '@/lib/sessions/api'

describe('Block 8 sessions api client', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.resetModules())

  it('generateSession posts direction parameters to the campaign generation endpoint', async () => {
    mockApiFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'session-8',
          session_number: 8,
          title: 'The Quiet Ledger',
          synopsis: 'Draft',
          main_objective: 'Objective',
          twist: 'Twist',
          encounters: [],
          faction_reactions: [],
          arc_progression: [],
          continuity_links: [],
          trace_id: 'session-8',
        }),
        { status: 200 }
      )
    )

    const result = await generateSession('camp-1', { goal: 'Open with Halia' })

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/campaigns/camp-1/generate-session',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ goal: 'Open with Halia' }),
      })
    )
    expect(result.id).toBe('session-8')
  })

  it('generateSession throws a retryable validation error on malformed Scribe output', async () => {
    mockApiFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: 'invalid llm output' }), {
        status: 422,
      })
    )

    await expect(generateSession('camp-1', {})).rejects.toBeInstanceOf(
      SessionValidationError
    )
  })

  it('getSession returns generated content for a flat session detail route', async () => {
    mockApiFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'session-8',
          campaign_id: 'camp-1',
          session_number: 8,
          summary: 'Draft',
          consequences: null,
          generated_content: {
            sections: [
              {
                id: 'synopsis',
                label: 'Synopsis',
                body: 'Draft',
                origin: 'scribe',
              },
            ],
          },
          trace_json: {},
          created_at: null,
          updated_at: null,
        }),
        { status: 200 }
      )
    )

    const result = await getSession('session-8')

    expect(mockApiFetch).toHaveBeenCalledWith('/sessions/session-8')
    expect(result.generated_content?.sections[0].label).toBe('Synopsis')
  })

  it('updateSessionContent patches the full generated_content object', async () => {
    const body = {
      generated_content: {
        sections: [
          {
            id: 'synopsis',
            label: 'Synopsis',
            body: 'Edited',
            origin: 'edited' as const,
          },
        ],
      },
    }
    mockApiFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'session-8',
          campaign_id: 'camp-1',
          session_number: 8,
          summary: 'Edited',
          consequences: null,
          generated_content: body.generated_content,
          trace_json: {},
          created_at: null,
          updated_at: null,
        }),
        { status: 200 }
      )
    )

    const result = await updateSessionContent('session-8', body)

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/sessions/session-8',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify(body) })
    )
    expect(result.generated_content?.sections[0].origin).toBe('edited')
  })

  it('classifies 404s as campaign/session not found and other statuses as generic API errors', async () => {
    mockApiFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
    )
    await expect(getSession('missing')).rejects.toBeInstanceOf(
      SessionCampaignNotFoundError
    )

    mockApiFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'boom' }), { status: 500 })
    )
    await expect(getSession('broken')).rejects.toBeInstanceOf(SessionApiError)
  })
})
