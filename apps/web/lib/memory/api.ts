import { apiFetch } from '@/lib/api'

import { z } from 'zod'

import {
  createMemoryFactRequestSchema,
  memoryFactResponseSchema,
  updateMemoryFactRequestSchema,
  type CreateMemoryFactRequest,
  type MemoryFactResponse,
  type MemoryStatus,
  type UpdateMemoryFactRequest,
} from './schemas'

const FALLBACK_ERROR_MESSAGE = 'Something went wrong. Please try again.'

export class MemoryApiError extends Error {}

export class MemoryCampaignNotFoundError extends MemoryApiError {}

export class MemoryFactNotFoundError extends MemoryApiError {}

/**
 * Extracts the most specific backend validation message the UI can safely show.
 *
 * @param {Response} response - The fetch response to inspect.
 * @returns {Promise<string>} A user-safe error message, with a fallback if parsing fails.
 */
async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (body && typeof body === 'object') {
      const { error, detail } = body as { error?: unknown; detail?: unknown }
      if (typeof error === 'string') return error
      if (typeof detail === 'string') return detail
      if (Array.isArray(detail)) {
        const first = detail.find(
          (d): d is { msg: string } =>
            Boolean(d) &&
            typeof d === 'object' &&
            typeof (d as { msg?: unknown }).msg === 'string'
        )
        if (first) return first.msg
      }
    }
  } catch {
    // Non-JSON error body. Use generic fallback.
  }
  return FALLBACK_ERROR_MESSAGE
}

/**
 * Converts HTTP failures into typed memory-domain client errors.
 *
 * @param {Response} response - The fetch response to classify.
 * @param {string} message - The error message to attach.
 * @param {'campaign' | 'memoryFact'} notFoundKind - Which not-found error type to raise on 404.
 * @throws {MemoryFactNotFoundError} On 404 with the memoryFact kind.
 * @throws {MemoryCampaignNotFoundError} On 404 with the campaign kind.
 * @throws {MemoryApiError} On any other non-404 failure.
 */
function throwForStatus(
  response: Response,
  message: string,
  notFoundKind: 'campaign' | 'memoryFact' = 'campaign'
): never {
  if (response.status === 404) {
    if (notFoundKind === 'memoryFact') {
      throw new MemoryFactNotFoundError(message)
    }
    throw new MemoryCampaignNotFoundError(message)
  }
  throw new MemoryApiError(message)
}

/**
 * Persists a DM-accepted memory fact under the owned campaign.
 *
 * @param {string} campaignId - The campaign that owns the memory fact.
 * @param {CreateMemoryFactRequest} payload - The validated creation payload.
 * @returns {Promise<MemoryFactResponse>} The created memory fact.
 */
export async function createMemoryFact(
  campaignId: string,
  payload: CreateMemoryFactRequest
): Promise<MemoryFactResponse> {
  const body = createMemoryFactRequestSchema.parse(payload)
  const response = await apiFetch(`/campaigns/${campaignId}/memory-facts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throwForStatus(response, await extractErrorMessage(response))
  }

  return memoryFactResponseSchema.parse(await response.json())
}

/**
 * Loads campaign memory facts, optionally constrained to active facts for review surfaces.
 *
 * @param {string} campaignId - The campaign that owns the memory facts.
 * @param {object} [options] - Optional query parameters.
 * @param {MemoryStatus} [options.status] - Filter by memory status.
 * @returns {Promise<MemoryFactResponse[]>} The matching memory facts.
 */
export async function getMemoryFacts(
  campaignId: string,
  options: { status?: MemoryStatus } = {}
): Promise<MemoryFactResponse[]> {
  const suffix = options.status ? `?status=${options.status}` : ''
  const response = await apiFetch(
    `/campaigns/${campaignId}/memory-facts${suffix}`
  )

  if (!response.ok) {
    throwForStatus(response, await extractErrorMessage(response))
  }

  return z.array(memoryFactResponseSchema).parse(await response.json())
}

/**
 * Updates an existing memory fact, including archive-style retirement.
 *
 * @param {string} memoryFactId - The memory fact to update.
 * @param {UpdateMemoryFactRequest} payload - The validated update payload.
 * @returns {Promise<MemoryFactResponse>} The updated memory fact.
 */
export async function updateMemoryFact(
  memoryFactId: string,
  payload: UpdateMemoryFactRequest
): Promise<MemoryFactResponse> {
  const body = updateMemoryFactRequestSchema.parse(payload)
  const response = await apiFetch(`/memory-facts/${memoryFactId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throwForStatus(response, await extractErrorMessage(response), 'memoryFact')
  }

  return memoryFactResponseSchema.parse(await response.json())
}
