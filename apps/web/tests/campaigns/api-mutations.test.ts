import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockApiFetch } = vi.hoisted(() => ({
  mockApiFetch: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  apiFetch: mockApiFetch,
}))

import {
  updateCampaign,
  createNpc,
  updateNpc,
  deleteNpc,
  createArc,
  CampaignApiError,
} from '@/lib/campaigns/api'

const NPC_ROW = {
  id: 'npc-1',
  name: 'Sildar',
  description: null,
  current_state: null,
  motivation: null,
  content_source: 'manual',
}

const ARC_ROW = {
  id: 'arc-1',
  title: 'The Pact',
  description: null,
  priority: 'medium',
  status: 'active',
  content_source: 'manual',
}

const CAMPAIGN_ROW = {
  id: 'camp-1',
  title: 'Shadows',
  description: null,
  world_state: 'new state',
  system: null,
  tone: null,
  updated_at: '2026-07-06T00:00:00Z',
}

function ok(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

describe('campaign mutation API client', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.resetModules())

  it('updateCampaign PATCHes and parses the mutation response', async () => {
    mockApiFetch.mockResolvedValue(ok(CAMPAIGN_ROW))

    const result = await updateCampaign('camp-1', { world_state: 'new state' })

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/campaigns/camp-1',
      expect.objectContaining({ method: 'PATCH' })
    )
    expect(result.world_state).toBe('new state')
  })

  it('createNpc POSTs and parses the created NPC', async () => {
    mockApiFetch.mockResolvedValue(ok(NPC_ROW, 201))

    const result = await createNpc({ campaign_id: 'camp-1', name: 'Sildar' })

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/npcs',
      expect.objectContaining({ method: 'POST' })
    )
    expect(result.id).toBe('npc-1')
  })

  it('updateNpc PATCHes /npcs/{id}', async () => {
    mockApiFetch.mockResolvedValue(ok(NPC_ROW))

    await updateNpc('npc-1', { name: 'Sildar the Bold' })

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/npcs/npc-1',
      expect.objectContaining({ method: 'PATCH' })
    )
  })

  it('deleteNpc DELETEs and resolves on 204', async () => {
    mockApiFetch.mockResolvedValue(new Response(null, { status: 204 }))

    await expect(deleteNpc('npc-1')).resolves.toBeUndefined()
    expect(mockApiFetch).toHaveBeenCalledWith('/npcs/npc-1', {
      method: 'DELETE',
    })
  })

  it('createArc parses the created arc with status/priority', async () => {
    mockApiFetch.mockResolvedValue(ok(ARC_ROW, 201))

    const result = await createArc({ campaign_id: 'camp-1', title: 'The Pact' })

    expect(result.status).toBe('active')
    expect(result.priority).toBe('medium')
  })

  it('throws CampaignApiError on a non-2xx mutation', async () => {
    mockApiFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Not found.' }), { status: 404 })
    )

    await expect(updateNpc('missing', { name: 'x' })).rejects.toThrow(
      CampaignApiError
    )
  })

  it('throws CampaignApiError when a delete fails', async () => {
    mockApiFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Not found.' }), { status: 404 })
    )

    await expect(deleteNpc('missing')).rejects.toThrow(CampaignApiError)
  })
})
