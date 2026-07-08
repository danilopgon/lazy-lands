import { apiFetch } from '@/lib/api'
import {
  AppError,
  normalizeBackendResponseError,
  type AppErrorOptions,
} from '@/lib/errors/app-error'

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

/**
 * Error thrown by the campaigns API client when a request fails.
 * Carries a stable localization key instead of raw backend display copy.
 */
export class CampaignApiError extends AppError {
  /**
   * Create a campaign API error from normalized metadata.
   * @param {AppError | AppErrorOptions | string} error - Normalized error or legacy test string.
   */
  constructor(error: AppError | AppErrorOptions | string) {
    super(
      typeof error === 'string'
        ? {
            code: 'backend.generic',
            source: 'backend',
            retryable: true,
            messageKey: 'backend.generic',
          }
        : error
    )
    this.name = 'CampaignApiError'
  }
}

/** Error thrown when a campaign lookup resolves to a 404/not-owned response. */
export class CampaignNotFoundError extends CampaignApiError {}

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
    throw new CampaignApiError(await normalizeBackendResponseError(response))
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
    throw new CampaignApiError(await normalizeBackendResponseError(response))
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
    throw new CampaignApiError(await normalizeBackendResponseError(response))
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
      throw new CampaignNotFoundError(
        await normalizeBackendResponseError(response)
      )
    }
    throw new CampaignApiError(await normalizeBackendResponseError(response))
  }

  return campaignDetailResponseSchema.parse(await response.json())
}

/**
 * Parse a JSON mutation response, throwing CampaignApiError on non-2xx.
 * @param {string} path - The API path (e.g. "/npcs/{id}").
 * @param {'POST' | 'PATCH'} method - The HTTP method.
 * @param {unknown} body - The JSON request body.
 * @param {z.ZodType<T>} schema - Zod schema the response is parsed with.
 * @returns {Promise<T>} The validated response.
 */
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
    throw new CampaignApiError(await normalizeBackendResponseError(response))
  }
  return schema.parse(await response.json())
}

/**
 * DELETE a resource; resolves on 2xx, throws CampaignApiError otherwise.
 * @param {string} path - The API path (e.g. "/npcs/{id}").
 * @returns {Promise<void>} Resolves when the delete succeeds.
 */
async function remove(path: string): Promise<void> {
  const response = await apiFetch(path, { method: 'DELETE' })
  if (!response.ok) {
    throw new CampaignApiError(await normalizeBackendResponseError(response))
  }
}

/**
 * `PATCH /campaigns/{id}` — partial edit of world_state/system/tone.
 * @param {string} id - The campaign id.
 * @param {UpdateCampaignPayload} payload - The fields to update.
 * @returns {Promise<CampaignMutationResponse>} The updated campaign row.
 */
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

/**
 * `POST /npcs` — create a DM-authored NPC.
 * @param {CreateNpcPayload} payload - The NPC to create (scoped by campaign_id).
 * @returns {Promise<NpcResponse>} The created NPC.
 */
export async function createNpc(
  payload: CreateNpcPayload
): Promise<NpcResponse> {
  return mutate('/npcs', 'POST', payload, npcResponseSchema)
}

/**
 * `PATCH /npcs/{id}` — partial NPC edit.
 * @param {string} id - The NPC id.
 * @param {UpdateNpcPayload} payload - The fields to update.
 * @returns {Promise<NpcResponse>} The updated NPC.
 */
export async function updateNpc(
  id: string,
  payload: UpdateNpcPayload
): Promise<NpcResponse> {
  return mutate(`/npcs/${id}`, 'PATCH', payload, npcResponseSchema)
}

/**
 * `DELETE /npcs/{id}`.
 * @param {string} id - The NPC id.
 * @returns {Promise<void>} Resolves when the NPC is deleted.
 */
export async function deleteNpc(id: string): Promise<void> {
  return remove(`/npcs/${id}`)
}

/**
 * `POST /factions` — create a DM-authored faction.
 * @param {CreateFactionPayload} payload - The faction to create (scoped by campaign_id).
 * @returns {Promise<FactionResponse>} The created faction.
 */
export async function createFaction(
  payload: CreateFactionPayload
): Promise<FactionResponse> {
  return mutate('/factions', 'POST', payload, factionResponseSchema)
}

/**
 * `PATCH /factions/{id}` — partial faction edit.
 * @param {string} id - The faction id.
 * @param {UpdateFactionPayload} payload - The fields to update.
 * @returns {Promise<FactionResponse>} The updated faction.
 */
export async function updateFaction(
  id: string,
  payload: UpdateFactionPayload
): Promise<FactionResponse> {
  return mutate(`/factions/${id}`, 'PATCH', payload, factionResponseSchema)
}

/**
 * `DELETE /factions/{id}`.
 * @param {string} id - The faction id.
 * @returns {Promise<void>} Resolves when the faction is deleted.
 */
export async function deleteFaction(id: string): Promise<void> {
  return remove(`/factions/${id}`)
}

/**
 * `POST /arcs` — create a DM-authored arc.
 * @param {CreateArcPayload} payload - The arc to create (scoped by campaign_id).
 * @returns {Promise<ArcResponse>} The created arc.
 */
export async function createArc(
  payload: CreateArcPayload
): Promise<ArcResponse> {
  return mutate('/arcs', 'POST', payload, arcResponseSchema)
}

/**
 * `PATCH /arcs/{id}` — partial arc edit (status changes flow through here).
 * @param {string} id - The arc id.
 * @param {UpdateArcPayload} payload - The fields to update.
 * @returns {Promise<ArcResponse>} The updated arc.
 */
export async function updateArc(
  id: string,
  payload: UpdateArcPayload
): Promise<ArcResponse> {
  return mutate(`/arcs/${id}`, 'PATCH', payload, arcResponseSchema)
}

/**
 * `DELETE /arcs/{id}`.
 * @param {string} id - The arc id.
 * @returns {Promise<void>} Resolves when the arc is deleted.
 */
export async function deleteArc(id: string): Promise<void> {
  return remove(`/arcs/${id}`)
}
