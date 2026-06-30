import type { User } from '@supabase/supabase-js'

const PROTECTED = ['/dashboard']

/**
 * Pure routing decision function.
 *
 * Returns "redirect" when an unauthenticated user requests a protected path.
 * Returns "passthrough" for all other cases — public routes and authenticated users.
 *
 * Kept pure (no I/O, no side effects) so it can be unit-tested with Vitest in
 * a jsdom environment without requiring the Edge runtime.
 */
export function decideAuth(
  user: User | null,
  pathname: string
): 'redirect' | 'passthrough' {
  const isProtected = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )

  if (isProtected && !user) {
    return 'redirect'
  }

  return 'passthrough'
}
