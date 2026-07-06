/**
 * Format an ISO date string as a short, human-readable date (e.g. "Jun 15, 2026").
 *
 * Shared by campaign cards and the campaign detail header so the "Updated {date}"
 * copy stays consistent across screens.
 *
 * @param {string} iso - An ISO-8601 date-time string.
 * @returns {string} The formatted short date.
 */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
