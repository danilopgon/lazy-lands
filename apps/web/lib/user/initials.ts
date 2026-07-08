/**
 * Derive up to two uppercase initials from a user's email for an avatar badge.
 *
 * Uses the local part (before `@`): when it splits into multiple segments on a
 * separator (`. _ -`), the first letter of the first two segments is taken
 * (`dani.perez` → `DP`); otherwise the first two letters of the single segment
 * (`contacto` → `CO`). Returns `?` when no letter is available, so the badge is
 * never blank.
 *
 * @param {string | null | undefined} email - The user's email, if known.
 * @returns {string} One or two uppercase initials, or `?` as a fallback.
 */
export function userInitials(email: string | null | undefined): string {
  const localPart = (email ?? '').split('@')[0]
  const segments = localPart.split(/[._-]+/).filter(Boolean)

  if (segments.length >= 2) {
    return (segments[0][0] + segments[1][0]).toUpperCase()
  }

  const single = segments[0] ?? ''
  if (single.length === 0) {
    return '?'
  }

  return single.slice(0, 2).toUpperCase()
}
