import { createBrowserClient } from '@supabase/ssr'

/**
 * Create a browser-side Supabase client using public env vars.
 *
 * @returns {ReturnType<typeof createBrowserClient>} A configured Supabase browser client instance.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  )
}
