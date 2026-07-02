/**
 * Resolve the public app origin used by Supabase auth email redirects.
 *
 * Supabase validates `redirectTo` against its allow-list and silently falls
 * back to a pathless `SiteURL` when the value is relative or unlisted, which
 * breaks the recovery/confirmation links. Local smoke tests may omit
 * NEXT_PUBLIC_APP_URL, so browser submissions fall back to the current origin
 * to keep the redirect absolute instead of sending `/auth/...` or
 * `undefined/...`.
 *
 * @returns {string} The configured app origin (trailing slashes stripped) or
 *   the current browser origin.
 */
export function resolveAppOrigin(): string {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim()

  if (configuredOrigin) {
    return configuredOrigin.replace(/\/+$/, '')
  }

  // Shared lib/auth helper: guard against server-side use where `window` is
  // undefined so a future Server Component / route handler import fails loudly
  // instead of throwing an opaque `ReferenceError`.
  if (typeof window === 'undefined') {
    throw new Error(
      'resolveAppOrigin() requires NEXT_PUBLIC_APP_URL when called outside the browser'
    )
  }

  return window.location.origin
}
