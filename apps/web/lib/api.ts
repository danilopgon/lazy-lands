import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

/**
 * Internal fetch wrapper that injects the active Supabase JWT into outgoing
 * requests. Designed to be used as the `queryFn` callback for TanStack Query
 * — it is NOT intended for direct use inside components.
 *
 * Usage with TanStack Query — the caller MUST check `response.ok` and throw on
 * non-2xx, otherwise TanStack Query caches error bodies (401/500) as valid data:
 * ```ts
 * const { data } = useQuery({
 *   queryKey: ['campaigns'],
 *   queryFn: async () => {
 *     const res = await apiFetch('/campaigns')
 *     if (!res.ok) throw new Error(`Request failed: ${res.status}`)
 *     return res.json()
 *   },
 * })
 * ```
 *
 * @param {string} path - Path starting with `/` (prefixed with NEXT_PUBLIC_API_URL) or an absolute URL.
 * @param {RequestInit} [init] - Optional fetch init options.
 * @returns {Promise<Response>} The raw Response — 4xx/5xx are NOT caught.
 */
export async function apiFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const { data } = await supabase.auth.getSession()
  const headers = new Headers(init?.headers)

  if (data.session?.access_token) {
    headers.set('Authorization', `Bearer ${data.session.access_token}`)
  }

  const url = path.startsWith('/')
    ? `${process.env.NEXT_PUBLIC_API_URL ?? ''}${path}`
    : path

  return fetch(url, { ...init, headers })
}
