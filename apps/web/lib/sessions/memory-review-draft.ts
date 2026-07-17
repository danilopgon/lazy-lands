import { z } from 'zod'

import { memorySuggestionSchema } from './schemas'
import type { MemorySuggestion } from './schemas'

const VERSION = 1
const PREFIX = `lazy-lands:memory-review:v${VERSION}`

const memoryReviewDraftSchema = z.object({
  version: z.literal(VERSION),
  campaign_id: z.string().min(1),
  session_id: z.string().min(1),
  // Nullable because a draft can also be seeded by DM-triggered recovery, which
  // re-reads a session by id and never learns its number. Registration always
  // supplies a real one.
  session_number: z.number().int().positive().nullable(),
  memory_suggestions: z.array(memorySuggestionSchema).max(5),
})

export type MemoryReviewDraft = z.infer<typeof memoryReviewDraftSchema>
export type MemoryReviewDraftInput = Omit<MemoryReviewDraft, 'version'>

/**
 * Builds the versioned storage key that isolates drafts by campaign and source session.
 *
 * @param {string} campaignId - The campaign that owns the draft.
 * @param {string} sessionId - The session whose suggestions are being reviewed.
 * @returns {string} The scoped session-storage key.
 */
function storageKey(campaignId: string, sessionId: string) {
  return `${PREFIX}:${campaignId}:${sessionId}`
}

/**
 * Stores only a validated transient review draft in session storage.
 *
 * @param {MemoryReviewDraftInput} input - The draft data, excluding the auto-set version field.
 * @returns {void}
 */
export function writeMemoryReviewDraft(input: MemoryReviewDraftInput): void {
  if (typeof window === 'undefined') return
  const draft = memoryReviewDraftSchema.parse({ version: VERSION, ...input })
  sessionStorage.setItem(
    storageKey(draft.campaign_id, draft.session_id),
    JSON.stringify(draft)
  )
}

/**
 * Reads a scoped draft and removes corrupt or mismatched data before it can render.
 *
 * @param {string} campaignId - The campaign that owns the draft.
 * @param {string} sessionId - The session whose suggestions are being reviewed.
 * @returns {MemoryReviewDraft | null} The validated draft, or null if missing or corrupt.
 */
export function readMemoryReviewDraft(
  campaignId: string,
  sessionId: string
): MemoryReviewDraft | null {
  if (typeof window === 'undefined') return null
  const key = storageKey(campaignId, sessionId)
  const raw = sessionStorage.getItem(key)
  if (!raw) return null

  try {
    const draft = memoryReviewDraftSchema.parse(JSON.parse(raw))
    if (draft.campaign_id !== campaignId || draft.session_id !== sessionId) {
      sessionStorage.removeItem(key)
      return null
    }
    return draft
  } catch {
    sessionStorage.removeItem(key)
    return null
  }
}

/**
 * Removes one scoped draft without touching other in-progress session reviews.
 *
 * @param {string} campaignId - The campaign that owns the draft.
 * @param {string} sessionId - The session whose draft to clear.
 * @returns {void}
 */
export function clearMemoryReviewDraft(
  campaignId: string,
  sessionId: string
): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(storageKey(campaignId, sessionId))
}

/**
 * Rewrites a scoped draft after a suggestion is accepted or dismissed.
 *
 * @param {string} campaignId - The campaign that owns the draft.
 * @param {string} sessionId - The session whose suggestions to rewrite.
 * @param {MemorySuggestion[]} remainingSuggestions - The suggestions that still await review.
 * @returns {void}
 */
export function rewriteMemoryReviewDraftSuggestions(
  campaignId: string,
  sessionId: string,
  remainingSuggestions: MemorySuggestion[]
): void {
  const draft = readMemoryReviewDraft(campaignId, sessionId)
  if (!draft) return

  if (remainingSuggestions.length === 0) {
    clearMemoryReviewDraft(campaignId, sessionId)
    return
  }

  writeMemoryReviewDraft({
    campaign_id: draft.campaign_id,
    session_id: draft.session_id,
    session_number: draft.session_number,
    memory_suggestions: remainingSuggestions,
  })
}

/**
 * Clears the draft once the DM has finished reviewing every pending suggestion.
 *
 * @param {string} campaignId - The campaign that owns the draft.
 * @param {string} sessionId - The session whose review is complete.
 * @returns {void}
 */
export function completeMemoryReviewDraft(
  campaignId: string,
  sessionId: string
): void {
  clearMemoryReviewDraft(campaignId, sessionId)
}
