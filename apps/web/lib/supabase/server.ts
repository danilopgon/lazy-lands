import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Create a server-side Supabase client that reads cookies from next/headers.
 *
 * @returns {Promise<ReturnType<typeof createServerClient>>} A configured Supabase server client instance.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server components cannot set cookies; middleware refreshes sessions.
          }
        },
      },
    }
  )
}
