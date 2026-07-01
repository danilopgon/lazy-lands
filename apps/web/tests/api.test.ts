import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('apiFetch — HTTP client (AU-003)', () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_URL

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000'
    vi.resetModules()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    process.env.NEXT_PUBLIC_API_URL = originalEnv
  })

  /**
   * Wire a mock getSession implementation into the Supabase client module.
   *
   * @param {ReturnType<typeof vi.fn>} getSessionImpl - The mock getSession function.
   */
  function setupMock(getSessionImpl: ReturnType<typeof vi.fn>) {
    vi.doMock('@/lib/supabase/client', () => ({
      createClient: () => ({
        auth: { getSession: getSessionImpl },
      }),
    }))
  }

  it('AU-T-12: injects Authorization header when session is active', async () => {
    const mockGetSession = vi.fn().mockResolvedValue({
      data: { session: { access_token: 'test-jwt-token' } },
    })
    setupMock(mockGetSession)

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('ok', { status: 200 }))

    const { apiFetch } = await import('../lib/api')
    await apiFetch('/campaigns')

    expect(fetchSpy).toHaveBeenCalledOnce()
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('http://localhost:8000/campaigns')
    const headers = new Headers((init as RequestInit).headers)
    expect(headers.get('Authorization')).toBe('Bearer test-jwt-token')
  })

  it('AU-T-13: does NOT inject Authorization header when no session', async () => {
    const mockGetSession = vi.fn().mockResolvedValue({
      data: { session: null },
    })
    setupMock(mockGetSession)

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('ok', { status: 200 }))

    const { apiFetch } = await import('../lib/api')
    await apiFetch('/campaigns')

    expect(fetchSpy).toHaveBeenCalledOnce()
    const [, init] = fetchSpy.mock.calls[0]
    const headers = new Headers((init as RequestInit)?.headers ?? {})
    expect(headers.get('Authorization')).toBeNull()
  })

  it('AU-T-14: prepends NEXT_PUBLIC_API_URL to relative paths', async () => {
    const mockGetSession = vi.fn().mockResolvedValue({
      data: { session: null },
    })
    setupMock(mockGetSession)

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('ok', { status: 200 }))

    const { apiFetch } = await import('../lib/api')
    await apiFetch('/campaigns')

    const [url] = fetchSpy.mock.calls[0]
    expect(url).toBe('http://localhost:8000/campaigns')
  })

  it('AU-T-14b: passes absolute URLs through unchanged', async () => {
    const mockGetSession = vi.fn().mockResolvedValue({
      data: { session: null },
    })
    setupMock(mockGetSession)

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('ok', { status: 200 }))

    const { apiFetch } = await import('../lib/api')
    await apiFetch('https://external.example.com/data')

    const [url] = fetchSpy.mock.calls[0]
    expect(url).toBe('https://external.example.com/data')
  })

  it('AU-003.3: returns raw Response without catching errors', async () => {
    const mockGetSession = vi.fn().mockResolvedValue({
      data: { session: null },
    })
    setupMock(mockGetSession)

    const errorResponse = new Response('not found', { status: 404 })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(errorResponse)

    const { apiFetch } = await import('../lib/api')
    const result = await apiFetch('/missing')

    expect(result.status).toBe(404)
    expect(result).toBe(errorResponse)
  })
})
