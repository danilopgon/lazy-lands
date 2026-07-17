import { apiFetch } from '@/lib/api'
import type { AppLocale } from '@/i18n/routing'

import { z } from 'zod'

import {
  completeSessionRequestSchema,
  memorySuggestionsResponseSchema,
  registerSessionResponseSchema,
  sessionResponseSchema,
  generateSessionRequestSchema,
  generateSessionResponseSchema,
  regenerateSectionRequestSchema,
  sessionDetailSchema,
  updateSessionContentSchema,
  type CompleteSessionRequest,
  type MemorySuggestionsResponse,
  type RegisterSessionRequest,
  type RegisterSessionResponse,
  type SessionResponse,
  type GenerateSessionRequest,
  type GenerateSessionResponse,
  type SectionId,
  type SessionDetail,
  type UpdateSessionContent,
} from './schemas'

/** Generic fallback shown when the backend error body has no recognizable message. */
const FALLBACK_ERROR_MESSAGE = 'Something went wrong. Please try again.'

/**
 * Error thrown by the sessions API client when a request fails.
 * Carries the backend-provided message (or a generic fallback) for display.
 */
export class SessionApiError extends Error {}

export class SessionCampaignNotFoundError extends SessionApiError {}

export class SessionValidationError extends SessionApiError {}

/** Raised when the persisted draft is missing or has no exportable sections (409). */
export class SessionNotExportableError extends SessionApiError {}

/**
 * Raised when a metered Scribe call is refused for rate or quota reasons (429).
 * Distinct from {@link SessionApiError} so the UI can tell the DM to wait rather
 * than implying the request itself was malformed.
 */
export class SessionRateLimitError extends SessionApiError {}

/**
 * A session that was generated but never played, so it has nothing to remember.
 *
 * Unlike the other recovery failures, this one is not retryable: the session
 * carries a planned synopsis, not an account of play, and no amount of asking
 * again changes that until the DM records what actually happened.
 */
export class SessionNotPlayedError extends SessionApiError {}

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
 * `POST /sessions/{sessionId}/complete` — record the played outcome onto a
 * session the Scribe already generated, instead of inserting a second row.
 *
 * The generate/complete pair are two phases of the SAME session row: this
 * writes only `summary`/`consequences`, so the prepared `generated_content`
 * survives untouched. The caller (not the backend) chooses between this and
 * {@link registerSession} — only the DM knows whether the session they played
 * was the one they prepared.
 *
 * @param {string} sessionId - The generated session to complete.
 * @param {CompleteSessionRequest} payload - The `{ summary, consequences? }` body.
 * @returns {Promise<RegisterSessionResponse>} The completed session plus 0-5 transient memory suggestions.
 * @throws {SessionCampaignNotFoundError} When the session is not found (404).
 * @throws {SessionValidationError} When the body fails validation (422).
 * @throws {SessionApiError} When the backend returns another non-2xx response.
 */
export async function completeSession(
  sessionId: string,
  payload: CompleteSessionRequest
): Promise<RegisterSessionResponse> {
  const body = completeSessionRequestSchema.parse(payload)
  const response = await apiFetch(`/sessions/${sessionId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new SessionCampaignNotFoundError(`Session ${sessionId} not found`)
    }
    if (response.status === 422) {
      throw new SessionValidationError(await extractErrorMessage(response))
    }
    throw new SessionApiError(await extractErrorMessage(response))
  }

  return registerSessionResponseSchema.parse(await response.json())
}

/**
 * `POST /sessions/{sessionId}/memory-suggestions` — re-ask the Scribe for memory
 * proposals from a session it has already persisted. Read-only: the session row
 * is never written, so this is safe to retry.
 *
 * POST rather than GET because it triggers a metered LLM call.
 *
 * A `200` carrying an empty list is a SUCCESS — it means the Scribe genuinely
 * proposed nothing. Only a thrown error means the Scribe failed; callers must
 * keep the two apart and never render a failure as "no proposals".
 *
 * @param {string} sessionId - The persisted session to re-read.
 * @returns {Promise<MemorySuggestionsResponse>} 0-5 transient, unpersisted proposals.
 * @throws {SessionCampaignNotFoundError} Unknown, foreign, or malformed session (404).
 * @throws {SessionValidationError} The Scribe returned unusable output (422, retryable).
 * @throws {SessionRateLimitError} Rate limit or quota exhausted (429).
 * @throws {SessionApiError} Any other non-2xx response.
 */
export async function recoverMemorySuggestions(
  sessionId: string
): Promise<MemorySuggestionsResponse> {
  const response = await apiFetch(`/sessions/${sessionId}/memory-suggestions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new SessionCampaignNotFoundError(`Session ${sessionId} not found`)
    }
    if (response.status === 409) {
      throw new SessionNotPlayedError(await extractErrorMessage(response))
    }
    if (response.status === 422) {
      throw new SessionValidationError(await extractErrorMessage(response))
    }
    if (response.status === 429) {
      throw new SessionRateLimitError(await extractErrorMessage(response))
    }
    throw new SessionApiError(await extractErrorMessage(response))
  }

  return memorySuggestionsResponseSchema.parse(await response.json())
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

/**
 * `POST /campaigns/{campaignId}/generate-session` — ask the Scribe for an editable draft.
 *
 * @param {string} campaignId - The owning campaign's id.
 * @param {GenerateSessionRequest} payload - Optional DM direction fields.
 * @returns {Promise<GenerateSessionResponse>} The generated session summary response.
 */
export async function generateSession(
  campaignId: string,
  payload: Partial<GenerateSessionRequest>
): Promise<GenerateSessionResponse> {
  const parsed = generateSessionRequestSchema.partial().parse(payload)
  const body = Object.fromEntries(
    Object.entries(parsed).filter(([key]) => key in payload)
  )
  const response = await apiFetch(`/campaigns/${campaignId}/generate-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new SessionCampaignNotFoundError(`Campaign ${campaignId} not found`)
    }
    if (response.status === 422) {
      throw new SessionValidationError(await extractErrorMessage(response))
    }
    throw new SessionApiError(await extractErrorMessage(response))
  }

  return generateSessionResponseSchema.parse(await response.json())
}

/**
 * `GET /sessions/{sessionId}` — fetch a generated session draft with JSON content.
 *
 * @param {string} sessionId - The session id.
 * @returns {Promise<SessionDetail>} The full generated-session detail row.
 */
export async function getSession(sessionId: string): Promise<SessionDetail> {
  const response = await apiFetch(`/sessions/${sessionId}`)

  if (!response.ok) {
    if (response.status === 404) {
      throw new SessionCampaignNotFoundError(`Session ${sessionId} not found`)
    }
    throw new SessionApiError(await extractErrorMessage(response))
  }

  return sessionDetailSchema.parse(await response.json())
}

/**
 * `PATCH /sessions/{sessionId}` — persist the current generated-content object.
 *
 * @param {string} sessionId - The session id.
 * @param {UpdateSessionContent} payload - Full generated content and optional summary/consequences.
 * @returns {Promise<SessionDetail>} The updated session detail row.
 */
export async function updateSessionContent(
  sessionId: string,
  payload: UpdateSessionContent
): Promise<SessionDetail> {
  const body = updateSessionContentSchema.parse(payload)
  const response = await apiFetch(`/sessions/${sessionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new SessionCampaignNotFoundError(`Session ${sessionId} not found`)
    }
    if (response.status === 422) {
      throw new SessionValidationError(await extractErrorMessage(response))
    }
    throw new SessionApiError(await extractErrorMessage(response))
  }

  return sessionDetailSchema.parse(await response.json())
}

/** Default download filename when the response carries no usable Content-Disposition. */
const FALLBACK_PDF_FILENAME = 'session-export.pdf'

/**
 * Extract the `filename` from a `Content-Disposition` attachment header.
 *
 * The RFC 5987 extended parameter (`filename*=UTF-8''…`) is percent-encoded and
 * takes precedence, so it is decoded. A plain `filename=` is NOT percent-encoded
 * and is returned verbatim — decoding it would throw on a literal `%` (e.g.
 * `100% Loot.pdf`).
 *
 * @param {string | null} header - The raw `Content-Disposition` header value, if any.
 * @returns {string | null} The parsed filename, or `null` when absent or unparseable.
 */
function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null

  const extended = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header)
  if (extended) {
    const raw = extended[1].trim().replace(/^"|"$/g, '')
    try {
      return decodeURIComponent(raw)
    } catch {
      // Malformed percent sequence — fall back to the plain filename below.
    }
  }

  const plain = /filename=("?)([^";]+)\1/i.exec(header)
  return plain ? plain[2].trim() : null
}

/**
 * Trigger a browser download for a Blob via a transient object URL.
 * The URL is always revoked, even if the click throws, to avoid leaks.
 *
 * @param {Blob} blob - The binary payload to download.
 * @param {string} filename - The suggested download filename.
 * @returns {void}
 */
function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * `GET /sessions/{sessionId}/export.pdf?section_id=…` — download the persisted,
 * edited draft as a private A4 PDF. IDs-only by design: only the selected
 * persisted section IDs travel to the backend, never unsaved prose or notes.
 *
 * On success the returned Blob is streamed to the browser as a file download
 * (create + revoke object URL) and the resolved filename is returned so the
 * caller can surface it in a success notice.
 *
 * Section headings and origin are stored as English keys, so the backend needs
 * `locale` to render them in the DM's language. It is required rather than
 * defaulted: an omitted locale would silently produce an English PDF from a
 * Spanish screen, which is the exact defect this parameter exists to prevent.
 *
 * @param {string} sessionId - The session id whose saved draft is exported.
 * @param {readonly string[]} sectionIds - Selected persisted section ids, in order.
 * @param {AppLocale} locale - The DM's active reading language.
 * @returns {Promise<string>} The downloaded attachment filename.
 * @throws {SessionValidationError} Empty, duplicate, or unknown selection (422).
 * @throws {SessionNotExportableError} Missing or non-exportable saved draft (409).
 * @throws {SessionCampaignNotFoundError} Unknown, foreign, or malformed session (404).
 * @throws {SessionApiError} Any other non-2xx response.
 */
export async function downloadSessionPdf(
  sessionId: string,
  sectionIds: readonly string[],
  locale: AppLocale
): Promise<string> {
  const params = new URLSearchParams()
  for (const id of sectionIds) params.append('section_id', id)
  params.append('locale', locale)

  const response = await apiFetch(
    `/sessions/${sessionId}/export.pdf?${params.toString()}`
  )

  if (!response.ok) {
    if (response.status === 404) {
      throw new SessionCampaignNotFoundError(`Session ${sessionId} not found`)
    }
    if (response.status === 409) {
      throw new SessionNotExportableError(await extractErrorMessage(response))
    }
    if (response.status === 422) {
      throw new SessionValidationError(await extractErrorMessage(response))
    }
    throw new SessionApiError(await extractErrorMessage(response))
  }

  const blob = await response.blob()
  const filename =
    filenameFromContentDisposition(
      response.headers.get('Content-Disposition')
    ) ?? FALLBACK_PDF_FILENAME
  triggerBlobDownload(blob, filename)
  return filename
}

/**
 * `POST /sessions/{sessionId}/regenerate-section` — ask the Scribe to rewrite
 * exactly one section. Pure — no steering/direction parameter exists; the DM
 * can only pick which section to regenerate.
 *
 * @param {string} sessionId - The session id.
 * @param {SectionId} sectionId - The canonical id of the section to regenerate.
 * @returns {Promise<SessionDetail>} The updated session detail row, with the
 *   targeted section's body replaced and its origin reset to `"scribe"`.
 * @throws {SessionValidationError} When the section id is unknown (422).
 * @throws {SessionCampaignNotFoundError} When the session is not found (404).
 * @throws {SessionApiError} When the backend returns another non-2xx response.
 */
export async function regenerateSection(
  sessionId: string,
  sectionId: SectionId
): Promise<SessionDetail> {
  const body = regenerateSectionRequestSchema.parse({ section_id: sectionId })
  const response = await apiFetch(`/sessions/${sessionId}/regenerate-section`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new SessionCampaignNotFoundError(`Session ${sessionId} not found`)
    }
    if (response.status === 422) {
      throw new SessionValidationError(await extractErrorMessage(response))
    }
    throw new SessionApiError(await extractErrorMessage(response))
  }

  return sessionDetailSchema.parse(await response.json())
}
