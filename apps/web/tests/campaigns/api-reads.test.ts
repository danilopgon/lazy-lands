import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockApiFetch } = vi.hoisted(() => ({
  mockApiFetch: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  apiFetch: mockApiFetch,
}))

import {
  getCampaigns,
  getCampaignDetail,
  CampaignApiError,
  CampaignNotFoundError,
} from '@/lib/campaigns/api'

const VALID_SUMMARY = {
  id: 'camp-1',
  title: 'Shadows over Phandalin',
  description: 'A frontier town beset by goblins',
  system: null,
  tone: null,
  updated_at: '2025-06-01T12:00:00Z',
  npc_count: 3,
  faction_count: 1,
  arc_count: 2,
}

const VALID_NPC = {
  id: 'npc-1',
  name: 'Elandra',
  description: 'A wandering scholar',
  current_state: 'Injured',
  motivation: 'Find the lost tome',
  content_source: 'llm' as const,
}

const VALID_FACTION = {
  id: 'fac-1',
  name: 'Redbrands',
  description: 'Local thugs',
  current_stance: 'Hostile',
  goals: 'Control the town',
  content_source: 'llm' as const,
}

const VALID_ARC = {
  id: 'arc-1',
  title: 'The Sundered Crown',
  description: 'A war of succession looms',
  priority: 'high' as const,
  status: 'open' as const,
  content_source: 'llm' as const,
}

const VALID_DETAIL = {
  id: 'camp-1',
  title: 'Shadows over Phandalin',
  description: 'A frontier town beset by goblins',
  world_state: 'Uneasy calm',
  system: null,
  tone: null,
  updated_at: '2025-06-01T12:00:00Z',
  npcs: [VALID_NPC],
  factions: [VALID_FACTION],
  arcs: [VALID_ARC],
}

describe('getCampaigns', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('returns parsed array of CampaignSummary on ok response', async () => {
    mockApiFetch.mockResolvedValue(
      new Response(JSON.stringify([VALID_SUMMARY]), { status: 200 })
    )

    const result = await getCampaigns()

    expect(mockApiFetch).toHaveBeenCalledWith('/campaigns')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('camp-1')
    expect(result[0].title).toBe('Shadows over Phandalin')
    expect(result[0].npc_count).toBe(3)
  })

  it('throws CampaignApiError on non-ok response', async () => {
    mockApiFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    )

    await expect(getCampaigns()).rejects.toThrow(CampaignApiError)
  })
})

describe('getCampaignDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('returns parsed CampaignDetailResponse with children on ok response', async () => {
    mockApiFetch.mockResolvedValue(
      new Response(JSON.stringify(VALID_DETAIL), { status: 200 })
    )

    const result = await getCampaignDetail('camp-1')

    expect(mockApiFetch).toHaveBeenCalledWith('/campaigns/camp-1')
    expect(result.id).toBe('camp-1')
    expect(result.npcs).toHaveLength(1)
    expect(result.factions).toHaveLength(1)
    expect(result.arcs).toHaveLength(1)
    expect(result.arcs[0].status).toBe('open')
  })

  it('throws CampaignNotFoundError on 404 response', async () => {
    mockApiFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    )

    await expect(getCampaignDetail('missing-id')).rejects.toThrow(
      CampaignNotFoundError
    )
  })

  it('throws CampaignApiError on non-ok non-404 response', async () => {
    mockApiFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
    )

    await expect(getCampaignDetail('camp-1')).rejects.toThrow(CampaignApiError)
  })
})

describe('read schema validation', () => {
  it('rejects malformed campaign summary data', async () => {
    mockApiFetch.mockResolvedValue(
      new Response(JSON.stringify([{ id: 'camp-1', title: 'ok' }]), {
        status: 200,
      })
    )

    await expect(getCampaigns()).rejects.toThrow()
  })

  it('rejects malformed campaign detail data', async () => {
    mockApiFetch.mockResolvedValue(
      new Response(JSON.stringify({ id: 'camp-1', title: 'ok' }), {
        status: 200,
      })
    )

    await expect(getCampaignDetail('camp-1')).rejects.toThrow()
  })
})
