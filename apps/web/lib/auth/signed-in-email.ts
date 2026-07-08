import { createClient } from '@/lib/supabase/server'

/**
 * Resolve the signed-in user's email server-side, or null when unauthenticated.
 * Shared by the authenticated layouts so their auth-to-header wiring stays in
 * one place. The middleware has already refreshed the session before this runs.
 *
 * @returns {Promise<string | null>} The user's email, or null.
 */
export async function getSignedInEmail(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user?.email ?? null
}
