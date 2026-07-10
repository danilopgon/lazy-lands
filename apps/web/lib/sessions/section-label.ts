const sectionLabelMessageKeys = [
  'synopsis',
  'main_objective',
  'twist',
  'encounters',
  'faction_reactions',
  'arc_progression',
] as const

export type SectionLabelMessageKey = (typeof sectionLabelMessageKeys)[number]

const sectionLabelKeySet = new Set<string>(sectionLabelMessageKeys)

/**
 * Resolve a generated-section canonical id into a stable i18n message key.
 *
 * The backend persists canonical section ids (`synopsis`, `main_objective`,
 * `twist`, …). This helper normalizes incoming ids and returns the matching
 * message key so the generated-session view can display localized section
 * labels without mutating the persisted `label` payload.
 *
 * @param {string | null | undefined} id - Raw section id from a generated-content payload.
 * @returns {SectionLabelMessageKey | null} Known message key, or null when the id is unknown.
 */
export function getSectionLabelMessageKey(
  id: string | null | undefined
): SectionLabelMessageKey | null {
  const normalized = normalizeSectionId(id)
  if (!normalized) return null
  if (sectionLabelKeySet.has(normalized))
    return normalized as SectionLabelMessageKey
  return null
}

/**
 * Normalize an incoming section id so casing and separator variants collapse
 * into the canonical snake_case form the message catalog uses as keys.
 *
 * @param {string | null | undefined} id - Raw section id.
 * @returns {string} Lower-cased, separator-normalized id (trimmed).
 */
function normalizeSectionId(id: string | null | undefined): string {
  return String(id ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}
