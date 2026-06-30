import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * Refresh the Supabase auth session via middleware cookies and return the current user.
 *
 * @param {NextRequest} request - The incoming Next.js request with cookie state.
 * @returns {Promise<{response: NextResponse, user: User|null}>} An object containing the response with updated cookies and the authenticated user (or null).
 */
export async function updateSession(
  request: NextRequest
): Promise<{ response: NextResponse; user: User | null }> {
  let response = NextResponse.next({ request })
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // Missing local/CI config should behave as unauthenticated, never undefined.
    return { response, user: null }
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  // Reuse the single getUser() call — its result feeds decideAuth.
  // Do NOT call getUser() a second time; one round-trip per request.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { response, user }
}
