const memoryTypeMessageKeys = [
  'consequence',
  'relationship',
  'secret',
  'promise',
  'tension',
  'revelation',
  'item',
  'arc_progress',
] as const

type MemoryTypeMessageKey = (typeof memoryTypeMessageKeys)[number]

const memoryTypeKeySet = new Set<string>(memoryTypeMessageKeys)

/**
 * Convert backend or legacy memory type values into stable i18n message keys.
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

  if (normalized.endsWith('_relationship')) return 'relationship'
  if (normalized.endsWith('_consequence')) return 'consequence'
  if (normalized.endsWith('_secret')) return 'secret'
  if (normalized.endsWith('_promise')) return 'promise'
  if (normalized.endsWith('_tension')) return 'tension'
  if (normalized.endsWith('_revelation')) return 'revelation'
  if (normalized.endsWith('_item')) return 'item'

  return null
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

function normalizeMemoryType(type: string | null | undefined): string {
  return String(type ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}
