import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }))

vi.mock('@/lib/api', () => ({ apiFetch: mockApiFetch }))

import {
  createMemoryFact,
  getMemoryFacts,
  MemoryApiError,
  MemoryCampaignNotFoundError,
  updateMemoryFact,
} from '@/lib/memory/api'

const memoryFact = {
  id: 'memory-1',
  campaign_id: 'camp-1',
  source_session_id: 'sess-1',
  content: 'Captain Vess owes the party a favor.',
  type: 'relationship',
  importance: 'high',
  status: 'active',
  created_at: '2026-07-09T00:00:00Z',
  updated_at: '2026-07-09T00:00:00Z',
}

describe('memory api client', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a MemoryFact under a campaign', async () => {
    mockApiFetch.mockResolvedValue(
      new Response(JSON.stringify(memoryFact), { status: 201 })
    )

    const result = await createMemoryFact('camp-1', {
      source_session_id: 'sess-1',
      content: 'Captain Vess owes the party a favor.',
      type: 'relationship',
      importance: 'high',
    })

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/campaigns/camp-1/memory-facts',
      expect.objectContaining({ method: 'POST' })
    )
    expect(result.status).toBe('active')
  })

  it('lists active MemoryFacts only when requested', async () => {
    mockApiFetch.mockResolvedValue(
      new Response(JSON.stringify([memoryFact]), { status: 200 })
    )

    const result = await getMemoryFacts('camp-1', { status: 'active' })

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/campaigns/camp-1/memory-facts?status=active'
    )
    expect(result).toHaveLength(1)
  })

  it('archives a MemoryFact via PATCH status archived', async () => {
    mockApiFetch.mockResolvedValue(
      new Response(JSON.stringify({ ...memoryFact, status: 'archived' }), {
        status: 200,
      })
    )

    const result = await updateMemoryFact('memory-1', { status: 'archived' })

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/memory-facts/memory-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'archived' }),
      })
    )
    expect(result.status).toBe('archived')
  })

  it('maps campaign 404s and generic backend failures', async () => {
    mockApiFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Not found.' }), { status: 404 })
    )

    await expect(getMemoryFacts('missing')).rejects.toBeInstanceOf(
      MemoryCampaignNotFoundError
    )

    mockApiFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Could not save the memory.' }), {
        status: 409,
      })
    )
    await expect(
      createMemoryFact('camp-1', { content: 'x' })
    ).rejects.toBeInstanceOf(MemoryApiError)
  })
})
