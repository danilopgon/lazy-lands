import { apiFetch } from '@/lib/api'

import { z } from 'zod'

import {
  registerSessionResponseSchema,
  sessionResponseSchema,
  type RegisterSessionRequest,
  type RegisterSessionResponse,
  type SessionResponse,
} from './schemas'

/** Generic fallback shown when the backend error body has no recognizable message. */
const FALLBACK_ERROR_MESSAGE = 'Something went wrong. Please try again.'

/**
 * Error thrown by the sessions API client when a request fails.
 * Carries the backend-provided message (or a generic fallback) for display.
 */
export class SessionApiError extends Error {}

export class SessionCampaignNotFoundError extends SessionApiError {}

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
    // Non-JSON error body — fall through to the generic message.
  }
  return FALLBACK_ERROR_MESSAGE
}

/**
 * `POST /campaigns/{campaignId}/sessions` — register a session; the backend
 * summarizes the campaign and suggests memories synchronously, persistence-first.
 *
 * @param {string} campaignId - The owning campaign's id.
 * @param {RegisterSessionRequest} payload - The `{ summary, consequences? }` body.
 * @returns {Promise<RegisterSessionResponse>} The persisted session plus 0-5 transient memory suggestions.
 * @throws {SessionCampaignNotFoundError} When the campaign is not found (404).
 * @throws {SessionApiError} When the backend returns another non-2xx response.
 */
export async function registerSession(
  campaignId: string,
  payload: RegisterSessionRequest
): Promise<RegisterSessionResponse> {
  const response = await apiFetch(`/campaigns/${campaignId}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new SessionCampaignNotFoundError(`Campaign ${campaignId} not found`)
    }
    throw new SessionApiError(await extractErrorMessage(response))
  }

  return registerSessionResponseSchema.parse(await response.json())
}

/**
 * `GET /campaigns/{campaignId}/sessions` — a campaign's session history,
 * chronologically ascending.
 *
 * @param {string} campaignId - The owning campaign's id.
 * @returns {Promise<SessionResponse[]>} The chronological session list.
 * @throws {SessionCampaignNotFoundError} When the campaign is not found (404).
 * @throws {SessionApiError} When the backend returns another non-2xx response.
 */
export async function getSessions(
  campaignId: string
): Promise<SessionResponse[]> {
  const response = await apiFetch(`/campaigns/${campaignId}/sessions`)

  if (!response.ok) {
    if (response.status === 404) {
      throw new SessionCampaignNotFoundError(`Campaign ${campaignId} not found`)
    }
    throw new SessionApiError(await extractErrorMessage(response))
  }

  return z.array(sessionResponseSchema).parse(await response.json())
}
