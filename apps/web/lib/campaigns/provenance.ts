import type { ContentSource } from './schemas'

/**
 * Map a persisted `content_source` value to the shared provenance badge
 * variant. LLM-authored content reads as the Scribe's; anything the DM has
 * touched (edited or manually added) reads as edited.
 *
 * @param {ContentSource} contentSource - The item's provenance value.
 * @returns {'scribe' | 'edited'} The `OriginBadge` variant.
 */
export function contentSourceToBadgeOrigin(
  contentSource: ContentSource
): 'scribe' | 'edited' {
  return contentSource === 'llm' ? 'scribe' : 'edited'
}
