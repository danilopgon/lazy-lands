import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockApiFetch } = vi.hoisted(() => ({
  mockApiFetch: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  apiFetch: mockApiFetch,
}))

import {
  extractCampaign,
  createCampaign,
  CampaignApiError,
} from '@/lib/campaigns/api'

describe('campaigns api client (CUI-001.3, CUI-002.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('extractCampaign posts raw_text as JSON to /campaigns/extract', async () => {
    const responseBody = {
      title: 'Shadows over Phandalin',
      description: 'A frontier town beset by goblins',
      world_state: 'Uneasy calm',
      npcs: [],
      factions: [],
      arcs: [],
    }
    mockApiFetch.mockResolvedValue(
      new Response(JSON.stringify(responseBody), { status: 200 })
    )

    const result = await extractCampaign('a'.repeat(120))

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/campaigns/extract',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ raw_text: 'a'.repeat(120) }),
      })
    )
    expect(result.title).toBe('Shadows over Phandalin')
  })

  it('extractCampaign throws CampaignApiError with the backend error message on failure', async () => {
    mockApiFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "The Scribe's proposal could not be parsed. Please try again.",
          retryable: true,
        }),
        { status: 422 }
      )
    )

    let caught: unknown
    try {
      await extractCampaign('a'.repeat(120))
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(CampaignApiError)
    expect((caught as Error).message).toMatch(/could not be parsed/i)
  })

  it('createCampaign posts the reviewed payload to POST /campaigns', async () => {
    mockApiFetch.mockResolvedValue(
      new Response(JSON.stringify({ id: 'campaign-123' }), { status: 200 })
    )

    const payload = {
      title: 'Shadows over Phandalin',
      description: 'A frontier town',
      world_state: 'Uneasy calm',
      system: 'D&D 5e',
      npcs: [],
      factions: [],
      arcs: [],
    }
    const result = await createCampaign(payload)

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/campaigns',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      })
    )
    expect(result.id).toBe('campaign-123')
  })

  it('createCampaign throws CampaignApiError on a failed save', async () => {
    mockApiFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: 'Could not save the campaign. Please retry.',
          retryable: true,
        }),
        { status: 409 }
      )
    )

    const payload = {
      title: 'Shadows over Phandalin',
      description: 'A frontier town',
      world_state: 'Uneasy calm',
      system: 'D&D 5e',
      npcs: [],
      factions: [],
      arcs: [],
    }

    await expect(createCampaign(payload)).rejects.toThrow(CampaignApiError)
  })
})
