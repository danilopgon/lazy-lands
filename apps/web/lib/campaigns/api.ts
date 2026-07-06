import { apiFetch } from '@/lib/api'

import { z } from 'zod'

import {
  extractCampaignOutputSchema,
  createCampaignResponseSchema,
  campaignSummarySchema,
  campaignDetailResponseSchema,
  campaignMutationResponseSchema,
  npcResponseSchema,
  factionResponseSchema,
  arcResponseSchema,
  type ExtractCampaignOutput,
  type CreateCampaignRequest,
  type CreateCampaignResponse,
  type CampaignSummary,
  type CampaignDetailResponse,
  type CampaignMutationResponse,
  type NpcResponse,
  type FactionResponse,
  type ArcResponse,
  type Priority,
  type ArcStatus,
} from './schemas'

/** Partial campaign edit accepted by `PATCH /campaigns/{id}`. */
export type UpdateCampaignPayload = {
  world_state?: string
  system?: string
  tone?: string | null
}

/** Body for `POST /npcs` (create) — `campaign_id` scopes ownership. */
export type CreateNpcPayload = {
  campaign_id: string
  name: string
  description?: string | null
  current_state?: string | null
  motivation?: string | null
}
/** Partial NPC edit for `PATCH /npcs/{id}`. */
export type UpdateNpcPayload = Partial<Omit<CreateNpcPayload, 'campaign_id'>>

/** Body for `POST /factions`. */
export type CreateFactionPayload = {
  campaign_id: string
  name: string
  description?: string | null
  current_stance?: string | null
  goals?: string | null
}
/** Partial faction edit for `PATCH /factions/{id}`. */
export type UpdateFactionPayload = Partial<
  Omit<CreateFactionPayload, 'campaign_id'>
>

/** Body for `POST /arcs`. */
export type CreateArcPayload = {
  campaign_id: string
  title: string
  description?: string | null
  priority?: Priority
  status?: ArcStatus
}
/** Partial arc edit for `PATCH /arcs/{id}`. */
export type UpdateArcPayload = Partial<Omit<CreateArcPayload, 'campaign_id'>>

/** Generic fallback shown when the backend error body has no recognizable message. */
const FALLBACK_ERROR_MESSAGE = 'Something went wrong. Please try again.'

/**
 * Error thrown by the campaigns API client when a request fails.
 * Carries the backend-provided message (or a generic fallback) for display.
 */
export class CampaignApiError extends Error {}

export class CampaignNotFoundError extends CampaignApiError {}

/**
 * Extract a message from a non-2xx JSON error body.
 *
 * Backend error handlers use `{ error: string, retryable: boolean }`
 * (see `services/api/app/shared/errors.py`); FastAPI's own validation
 * errors use `{ detail: ... }`. Falls back to a generic message otherwise.
 *
 * @param {Response} response - The non-ok fetch Response.
 * @returns {Promise<string>} The extracted or fallback error message.
 */
async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (body && typeof body === 'object') {
      const { error, detail } = body as { error?: unknown; detail?: unknown }
      if (typeof error === 'string') return error
      if (typeof detail === 'string') return detail
    }
  } catch {
    // Non-JSON error body — fall through to the generic message.
  }
  return FALLBACK_ERROR_MESSAGE
}

/**
 * Call `POST /campaigns/extract` with the DM's free-text premise.
 *
 * Stateless on the backend — writes nothing, returns a validated proposal.
 *
 * @param {string} rawText - The DM's free-text premise (100-8000 chars).
 * @returns {Promise<ExtractCampaignOutput>} The validated extracted campaign scaffold.
 * @throws {CampaignApiError} When the backend returns a non-2xx response.
 */
export async function extractCampaign(
  rawText: string
): Promise<ExtractCampaignOutput> {
  const response = await apiFetch('/campaigns/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw_text: rawText }),
  })

  if (!response.ok) {
    throw new CampaignApiError(await extractErrorMessage(response))
  }

  return extractCampaignOutputSchema.parse(await response.json())
}

/**
 * Call `POST /campaigns` with the DM-reviewed campaign payload.
 *
 * @param {CreateCampaignRequest} payload - The reviewed title/description/world_state/npcs/factions/arcs.
 * @returns {Promise<CreateCampaignResponse>} The created campaign's id.
 * @throws {CampaignApiError} When the backend returns a non-2xx response.
 */
export async function createCampaign(
  payload: CreateCampaignRequest
): Promise<CreateCampaignResponse> {
  const response = await apiFetch('/campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new CampaignApiError(await extractErrorMessage(response))
  }

  return createCampaignResponseSchema.parse(await response.json())
}

/**
 * Fetch all campaigns owned by the authenticated user.
 *
 * @returns {Promise<CampaignSummary[]>} The list of campaigns, ordered by updated_at descending.
 * @throws {CampaignApiError} When the backend returns a non-2xx response.
 */
export async function getCampaigns(): Promise<CampaignSummary[]> {
  const response = await apiFetch('/campaigns')

  if (!response.ok) {
    throw new CampaignApiError(await extractErrorMessage(response))
  }

  return z.array(campaignSummarySchema).parse(await response.json())
}

/**
 * Fetch a single campaign with its children (NPCs, factions, arcs).
 *
 * @param {string} id - The campaign id.
 * @returns {Promise<CampaignDetailResponse>} The campaign detail with children.
 * @throws {CampaignNotFoundError} When the campaign is not found (404).
 * @throws {CampaignApiError} When the backend returns a non-2xx response.
 */
export async function getCampaignDetail(
  id: string
): Promise<CampaignDetailResponse> {
  const response = await apiFetch(`/campaigns/${id}`)

  if (!response.ok) {
    if (response.status === 404) {
      throw new CampaignNotFoundError(`Campaign ${id} not found`)
    }
    throw new CampaignApiError(await extractErrorMessage(response))
  }

  return campaignDetailResponseSchema.parse(await response.json())
}

/** Parse a JSON mutation response, throwing CampaignApiError on non-2xx. */
async function mutate<T>(
  path: string,
  method: 'POST' | 'PATCH',
  body: unknown,
  schema: z.ZodType<T>
): Promise<T> {
  const response = await apiFetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw new CampaignApiError(await extractErrorMessage(response))
  }
  return schema.parse(await response.json())
}

/** DELETE a resource; resolves on 2xx, throws CampaignApiError otherwise. */
async function remove(path: string): Promise<void> {
  const response = await apiFetch(path, { method: 'DELETE' })
  if (!response.ok) {
    throw new CampaignApiError(await extractErrorMessage(response))
  }
}

/** `PATCH /campaigns/{id}` — partial edit of world_state/system/tone. */
export async function updateCampaign(
  id: string,
  payload: UpdateCampaignPayload
): Promise<CampaignMutationResponse> {
  return mutate(
    `/campaigns/${id}`,
    'PATCH',
    payload,
    campaignMutationResponseSchema
  )
}

/** `POST /npcs` — create a DM-authored NPC. */
export async function createNpc(
  payload: CreateNpcPayload
): Promise<NpcResponse> {
  return mutate('/npcs', 'POST', payload, npcResponseSchema)
}

/** `PATCH /npcs/{id}` — partial NPC edit. */
export async function updateNpc(
  id: string,
  payload: UpdateNpcPayload
): Promise<NpcResponse> {
  return mutate(`/npcs/${id}`, 'PATCH', payload, npcResponseSchema)
}

/** `DELETE /npcs/{id}`. */
export async function deleteNpc(id: string): Promise<void> {
  return remove(`/npcs/${id}`)
}

/** `POST /factions` — create a DM-authored faction. */
export async function createFaction(
  payload: CreateFactionPayload
): Promise<FactionResponse> {
  return mutate('/factions', 'POST', payload, factionResponseSchema)
}

/** `PATCH /factions/{id}` — partial faction edit. */
export async function updateFaction(
  id: string,
  payload: UpdateFactionPayload
): Promise<FactionResponse> {
  return mutate(`/factions/${id}`, 'PATCH', payload, factionResponseSchema)
}

/** `DELETE /factions/{id}`. */
export async function deleteFaction(id: string): Promise<void> {
  return remove(`/factions/${id}`)
}

/** `POST /arcs` — create a DM-authored arc. */
export async function createArc(
  payload: CreateArcPayload
): Promise<ArcResponse> {
  return mutate('/arcs', 'POST', payload, arcResponseSchema)
}

/** `PATCH /arcs/{id}` — partial arc edit (status changes flow through here). */
export async function updateArc(
  id: string,
  payload: UpdateArcPayload
): Promise<ArcResponse> {
  return mutate(`/arcs/${id}`, 'PATCH', payload, arcResponseSchema)
}

/** `DELETE /arcs/{id}`. */
export async function deleteArc(id: string): Promise<void> {
  return remove(`/arcs/${id}`)
}
