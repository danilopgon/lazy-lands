import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockApiFetch } = vi.hoisted(() => ({
  mockApiFetch: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  apiFetch: mockApiFetch,
}))

import {
  registerSession,
  getSessions,
  SessionApiError,
  SessionCampaignNotFoundError,
} from '@/lib/sessions/api'

describe('sessions api client (Block 7a frontend)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('registerSession posts { summary, consequences } to POST /campaigns/{id}/sessions', async () => {
    const responseBody = {
      session_id: 'sess-1',
      session_number: 1,
      memory_suggestions: [],
    }
    mockApiFetch.mockResolvedValue(
      new Response(JSON.stringify(responseBody), { status: 200 })
    )

    const result = await registerSession('camp-1', {
      summary: 'The party arrived in town.',
    })

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/campaigns/camp-1/sessions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ summary: 'The party arrived in town.' }),
      })
    )
    expect(result.session_id).toBe('sess-1')
    expect(result.session_number).toBe(1)
  })

  it('registerSession throws SessionCampaignNotFoundError on 404', async () => {
    mockApiFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
    )

    await expect(
      registerSession('forged-id', { summary: 'x' })
    ).rejects.toBeInstanceOf(SessionCampaignNotFoundError)
  })

  it('registerSession throws SessionApiError with the backend message on other failures', async () => {
    mockApiFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Could not save the session.' }), {
        status: 500,
      })
    )

    let caught: unknown
    try {
      await registerSession('camp-1', { summary: 'x' })
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(SessionApiError)
    expect((caught as Error).message).toMatch(/could not save the session/i)
  })

  it('getSessions returns the chronological session list', async () => {
    const responseBody = [
      {
        id: 'sess-1',
        session_number: 1,
        summary: 'First session',
        consequences: null,
        created_at: '2026-06-01T10:00:00Z',
      },
      {
        id: 'sess-2',
        session_number: 2,
        summary: 'Second session',
        consequences: 'Something changed',
        created_at: '2026-06-08T10:00:00Z',
      },
    ]
    mockApiFetch.mockResolvedValue(
      new Response(JSON.stringify(responseBody), { status: 200 })
    )

    const result = await getSessions('camp-1')

    expect(mockApiFetch).toHaveBeenCalledWith('/campaigns/camp-1/sessions')
    expect(result).toHaveLength(2)
    expect(result[0].session_number).toBe(1)
  })

  it('getSessions returns an empty array for a campaign with no sessions', async () => {
    mockApiFetch.mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 })
    )

    const result = await getSessions('camp-1')

    expect(result).toEqual([])
  })
})
