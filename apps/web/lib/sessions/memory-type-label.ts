const memoryTypeMessageKeys = [
  'consequence',
  'relationship',
  'secret',
  'promise',
  'tension',
  'revelation',
  'item',
  'arc_progress',
  'reputation',
  'world_state_change',
] as const

type MemoryTypeMessageKey = (typeof memoryTypeMessageKeys)[number]

const memoryTypeKeySet = new Set<string>(memoryTypeMessageKeys)

const legacyMemoryTypeMap = new Map<string, MemoryTypeMessageKey>([
  ['faction_relationship', 'relationship'],
  ['npc_relationship', 'relationship'],
  ['story_arc_progress', 'arc_progress'],
  ['npc_revelation', 'revelation'],
])

/**
 * Convert backend or legacy memory type values into stable i18n message keys.
 *
 * Covers canonical `MemoryType` values first. A small explicit legacy map keeps
 * previously persisted readable labels localized without treating arbitrary LLM
 * type drift as canonical behavior.
 *
 * @param {string | null | undefined} type - Raw memory type from a payload.
 * @returns {MemoryTypeMessageKey | null} Known message key, or null for fallback copy.
 */
export function getMemoryTypeMessageKey(
  type: string | null | undefined
): MemoryTypeMessageKey | null {
  const normalized = normalizeMemoryType(type)
  if (!normalized) return null
  if (memoryTypeKeySet.has(normalized))
    return normalized as MemoryTypeMessageKey
  return legacyMemoryTypeMap.get(normalized) ?? null
}

/**
 * Humanize unknown memory types without throwing missing-message runtime errors.
 *
 * @param {string | null | undefined} type - Raw persisted memory type.
 * @returns {string} A readable fallback label.
 */
export function humanizeMemoryType(type: string | null | undefined): string {
  const value = String(type ?? '').trim()
  if (!value) return 'Memory'

  const humanized = value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  return humanized.charAt(0).toUpperCase() + humanized.slice(1)
}

/**
 * Normalize a raw memory type so casing and separator variants collapse into
 * the canonical lower-snake_case form the message-key set and suffix patterns
 * match against.
 *
 * @param {string | null | undefined} type - Raw persisted memory type.
 * @returns {string} Lower-cased, separator-normalized type (trimmed).
 */
function normalizeMemoryType(type: string | null | undefined): string {
  return String(type ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}
