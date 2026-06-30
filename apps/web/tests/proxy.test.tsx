import type { User } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock updateSession to return the { response, user } contract
const mockResponse = new NextResponse(null, { status: 200 })

vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: vi.fn(),
}))

// Helper: build a minimal NextRequest-like object from a URL string.
// proxy.ts uses `new URL(request.url).pathname` and `request.url`, so a plain
// Request cast satisfies that contract without needing nextUrl.
/**
 * Build a minimal NextRequest-compatible object from a URL string for proxy tests.
 *
 * @param {string} url - The URL string to create the request from.
 * @returns {NextRequest} A NextRequest-compatible object for use in proxy tests.
 */
function makeRequest(url: string): NextRequest {
  return new Request(url) as unknown as NextRequest
}

describe('proxy — session-management (Phase 2B)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('SM-proxy-01: passes through authenticated user on /dashboard', async () => {
    const { updateSession } = await import('@/lib/supabase/middleware')
    const mockUser: User = { id: 'user-123' } as User
    vi.mocked(updateSession).mockResolvedValue({
      response: mockResponse,
      user: mockUser,
    })

    const { proxy } = await import('../proxy')
    const request = makeRequest('http://localhost:3000/dashboard')
    const result = await proxy(request)

    // Authenticated → pass through the session response unchanged
    expect(result).toBe(mockResponse)
  })

  it('SM-proxy-02: redirects unauthenticated user from /dashboard to /login', async () => {
    const { updateSession } = await import('@/lib/supabase/middleware')
    vi.mocked(updateSession).mockResolvedValue({
      response: mockResponse,
      user: null,
    })

    const { proxy } = await import('../proxy')
    const request = makeRequest('http://localhost:3000/dashboard')
    const result = await proxy(request)

    // Unauthenticated on protected route → 302 redirect to /login, NOT the session response
    expect(result).not.toBe(mockResponse)
    expect(result.status).toBe(302)
    expect(result.headers.get('location')).toContain('/login')
  })

  it('SM-proxy-02b: preserves session Set-Cookie headers when redirecting unauthenticated /dashboard requests', async () => {
    const { updateSession } = await import('@/lib/supabase/middleware')
    const cleanupResponse = new NextResponse(null, { status: 200 })
    cleanupResponse.cookies.set('sb-session', '', {
      httpOnly: true,
      maxAge: 0,
      path: '/',
      sameSite: 'lax',
    })
    cleanupResponse.cookies.set('sb-refresh-token', '', {
      httpOnly: true,
      maxAge: 0,
      path: '/',
      sameSite: 'lax',
    })
    vi.mocked(updateSession).mockResolvedValue({
      response: cleanupResponse,
      user: null,
    })

    const { proxy } = await import('../proxy')
    const request = makeRequest('http://localhost:3000/dashboard')
    const result = await proxy(request)

    expect(result).not.toBe(cleanupResponse)
    expect(result.status).toBe(302)
    expect(result.headers.get('location')).toContain('/login')
    expect(result.headers.getSetCookie()).toEqual(
      expect.arrayContaining([
        expect.stringContaining('sb-session='),
        expect.stringContaining('sb-refresh-token='),
      ])
    )
  })

  it('SM-proxy-03: passes through unauthenticated user on public route /login', async () => {
    const { updateSession } = await import('@/lib/supabase/middleware')
    vi.mocked(updateSession).mockResolvedValue({
      response: mockResponse,
      user: null,
    })

    const { proxy } = await import('../proxy')
    const request = makeRequest('http://localhost:3000/login')
    const result = await proxy(request)

    // Public route → always pass through
    expect(result).toBe(mockResponse)
  })

  it('SM-proxy-04: preserves refreshed Set-Cookie headers from updateSession', async () => {
    const { updateSession } = await import('@/lib/supabase/middleware')
    const refreshedResponse = new NextResponse(null, { status: 200 })
    refreshedResponse.cookies.set('sb-session', 'refreshed-token', {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
    })
    const mockUser: User = { id: 'user-123' } as User
    vi.mocked(updateSession).mockResolvedValue({
      response: refreshedResponse,
      user: mockUser,
    })

    const { proxy } = await import('../proxy')
    const request = makeRequest('http://localhost:3000/dashboard')
    const result = await proxy(request)

    expect(result).toBe(refreshedResponse)
    expect(result.headers.getSetCookie()).toEqual(
      expect.arrayContaining([
        expect.stringContaining('sb-session=refreshed-token'),
      ])
    )
  })

  it('SM-proxy-05: preserves the existing broad matcher (session-refresh for all non-asset paths)', async () => {
    const { config } = await import('../proxy')

    expect(config.matcher).toEqual([
      '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ])
  })
})
