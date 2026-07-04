/**
 *  Resolves the full API URL for a given path, using the NEXT_PUBLIC_API_URL environment variable as the base.
 *
 *  @param {string} path - The API path to resolve. If it starts with '/', it will be prefixed with NEXT_PUBLIC_API_URL.
 *  @throws {Error} If NEXT_PUBLIC_API_URL is not configured and the path starts with '/'.
 *  @returns {string} The full API URL.
 */
function resolveApiUrl(path: string) {
  if (!path.startsWith('/')) {
    return path
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, '')

  if (!apiUrl) {
    throw new Error(
      'NEXT_PUBLIC_API_URL must be configured before calling backend API routes.'
    )
  }

  return `${apiUrl}${path}`
}

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
  // Dynamically import the Supabase client to avoid SSR issues.
  // The createBrowserClient from @supabase/ssr accesses `location` during import,
  // which causes ReferenceError during next build if imported at module scope.
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const { data } = await supabase.auth.getSession()
  const headers = new Headers(init?.headers)

  if (data.session?.access_token) {
    headers.set('Authorization', `Bearer ${data.session.access_token}`)
  }

  const url = resolveApiUrl(path)

  return fetch(url, { ...init, headers })
}
