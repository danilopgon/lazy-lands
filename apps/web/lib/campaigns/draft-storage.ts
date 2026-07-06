import { z } from 'zod'

import {
  extractCampaignOutputSchema,
  type ExtractCampaignOutput,
} from './schemas'

/**
 * sessionStorage key holding the extracted campaign payload between
 * `/campaigns/new` and `/campaigns/new/review`. There is no server-side
 * draft — `/campaigns/extract` is stateless (NFR-CUI-2).
 */
export const DRAFT_STORAGE_KEY = 'lazy-lands:campaign-extraction-draft'

/**
 * The stored draft: the Scribe's extraction output plus the `system`/`tone`
 * the DM entered on `/campaigns/new`. `system`/`tone` are folded into
 * `raw_text` for extraction but are also persisted verbatim on the campaign
 * (Block 6, WU3 Migration A), so the review screen carries them into the
 * `POST /campaigns` body.
 */
export const campaignDraftSchema = extractCampaignOutputSchema.extend({
  system: z.string(),
  tone: z.string().nullable(),
})
export type CampaignDraft = z.infer<typeof campaignDraftSchema>

/**
 * Save the Scribe's extracted proposal plus the DM's system/tone so the
 * review screen can read them after client-side navigation.
 *
 * @param {ExtractCampaignOutput} draft - The extracted campaign payload.
 * @param {{ system: string; tone?: string | null }} meta - The DM's system/tone from the new-campaign form.
 * @param {string} meta.system - The game system (e.g. "D&D 5e").
 * @param {string | null} [meta.tone] - The optional campaign tone.
 */
export function saveExtractionDraft(
  draft: ExtractCampaignOutput,
  meta: { system: string; tone?: string | null }
): void {
  const stored: CampaignDraft = {
    ...draft,
    system: meta.system,
    tone: meta.tone ?? null,
  }
  sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(stored))
}

/**
 * Read the previously saved extraction draft, if any.
 *
 * @returns {CampaignDraft | null} The parsed draft, or `null` when nothing was
 *   saved or the stored value fails schema validation.
 */
export function readExtractionDraft(): CampaignDraft | null {
  const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY)
  if (!raw) return null

  try {
    return campaignDraftSchema.parse(JSON.parse(raw))
  } catch {
    return null
  }
}

/** Remove the stored extraction draft (called after a successful create). */
export function clearExtractionDraft(): void {
  sessionStorage.removeItem(DRAFT_STORAGE_KEY)
}
