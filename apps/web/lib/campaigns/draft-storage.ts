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
 * Save the Scribe's extracted proposal so the review screen can read it
 * after client-side navigation.
 *
 * @param {ExtractCampaignOutput} draft - The extracted campaign payload.
 */
export function saveExtractionDraft(draft: ExtractCampaignOutput): void {
  sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
}

/**
 * Read the previously saved extraction draft, if any.
 *
 * @returns {ExtractCampaignOutput | null} The parsed draft, or `null` when
 *   nothing was saved or the stored value fails schema validation.
 */
export function readExtractionDraft(): ExtractCampaignOutput | null {
  const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = extractCampaignOutputSchema.parse(JSON.parse(raw))
    return parsed
  } catch {
    return null
  }
}

/** Remove the stored extraction draft (called after a successful create). */
export function clearExtractionDraft(): void {
  sessionStorage.removeItem(DRAFT_STORAGE_KEY)
}
