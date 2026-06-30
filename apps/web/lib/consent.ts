export const CONSENT_KEY = 'll-cookie-consent'
export const ANNOUNCEMENT_KEY = 'll-announcement-dismissed'

/**
 * Returns the current cookie consent value, or null if not set.
 * SSR-safe: guards against typeof window === 'undefined'.
 *
 * @returns {'acknowledged'|null} The consent value "acknowledged", or null if not yet set or in SSR.
 */
export function getConsent(): 'acknowledged' | null {
  if (typeof window === 'undefined') return null
  return (localStorage.getItem(CONSENT_KEY) as 'acknowledged' | null) ?? null
}

/**
 * Records user consent by writing "acknowledged" to localStorage.
 * SSR-safe: no-ops when window is unavailable.
 */
export function setConsent(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(CONSENT_KEY, 'acknowledged')
}

/**
 * Returns true if the announcement bar has been dismissed.
 * SSR-safe: returns false when window is unavailable.
 *
 * @returns {boolean} True if the announcement has been dismissed, false otherwise or in SSR.
 */
export function getAnnouncementDismissed(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(ANNOUNCEMENT_KEY) !== null
}

/**
 * Records that the announcement bar has been dismissed.
 * SSR-safe: no-ops when window is unavailable.
 */
export function setAnnouncementDismissed(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ANNOUNCEMENT_KEY, 'dismissed')
}
