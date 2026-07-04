import type { User } from '@supabase/supabase-js'

const PROTECTED = ['/dashboard', '/campaigns']
type AuthDecision = 'redirect' | 'redirectToDashboard' | 'passthrough'

/**
 * Pure routing decision function.
 *
 * Returns "redirect" when an unauthenticated user requests a protected path.
 * Returns "passthrough" for all other cases — public routes and authenticated users.
 *
 * Kept pure (no I/O, no side effects) so it can be unit-tested with Vitest in
 * a jsdom environment without requiring the Edge runtime.
 *
 * @param {User|null} user - The authenticated Supabase user, or null if unauthenticated.
 * @param {string} pathname - The current request pathname.
 * @returns {'redirect'|'passthrough'} "redirect" if the user should be sent to login, "passthrough" otherwise.
 */
export function decideAuth(user: User | null, pathname: string): AuthDecision {
  if (pathname === '/' && user) {
    return 'redirectToDashboard'
  }

  const isProtected = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )

  if (isProtected && !user) {
    return 'redirect'
  }

  return 'passthrough'
}
