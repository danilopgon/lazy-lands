/**
 * Slugify a piece of human text for use in a filename: lowercase, strip accents,
 * and collapse any run of non-alphanumeric characters into a single hyphen.
 *
 * @param {string} value - The text to slugify (e.g. a campaign title).
 * @returns {string} A hyphen-separated, accent-free, lowercase slug.
 */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Build the simulated PDF download filename for the public demo export screen.
 *
 * Unlike the real app, the demo never hits the backend (which would return the
 * name via `Content-Disposition`), so the name is derived from live store state:
 * the campaign title and the current generated session number. Both the title
 * and the session word are locale-dependent, so a Spanish visitor gets a fully
 * Spanish, accent-free filename rather than a stale English "session-8" one.
 *
 * @param {string} campaignTitle - The (localized) campaign title.
 * @param {number} sessionNumber - The current generated draft's session number.
 * @param {string} sessionWord - The localized word for "session" (slugified here).
 * @returns {string} The `.pdf` filename to surface in the export success notice.
 */
export function demoExportFilename(
  campaignTitle: string,
  sessionNumber: number,
  sessionWord: string
): string {
  return `${slugify(campaignTitle)}-${slugify(sessionWord)}-${sessionNumber}.pdf`
}
