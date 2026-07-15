import type { User } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock updateSession to return the { response, user } contract
const mockResponse = new NextResponse(null, { status: 200 })

vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: vi.fn(),
}))

vi.mock('next-intl/middleware', () => ({
  default: () => () => NextResponse.next(),
}))

// Helper: build a real NextRequest from a URL string. A real NextRequest is
// needed (not a plain `Request` cast) because proxy.ts reads `request.cookies`
// to seed the locale cookie; NextRequest provides the `cookies` accessor.
/**
 * Build a NextRequest from a URL string for proxy tests.
 *
 * @param {string} url - The URL string to create the request from.
 * @returns {NextRequest} A NextRequest for use in proxy tests.
 */
function makeRequest(url: string): NextRequest {
  return new NextRequest(url)
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

  it('redirects unauthenticated users from /campaigns/new/review to /login', async () => {
    const { updateSession } = await import('@/lib/supabase/middleware')
    vi.mocked(updateSession).mockResolvedValue({
      response: mockResponse,
      user: null,
    })

    const { proxy } = await import('../proxy')
    const request = makeRequest('http://localhost:3000/campaigns/new/review')
    const result = await proxy(request)

    expect(result.status).toBe(302)
    expect(result.headers.get('location')).toContain('/login')
  })

  it('redirects authenticated users from / to /dashboard', async () => {
    const { updateSession } = await import('@/lib/supabase/middleware')
    const mockUser: User = { id: 'user-123' } as User
    vi.mocked(updateSession).mockResolvedValue({
      response: mockResponse,
      user: mockUser,
    })

    const { proxy } = await import('../proxy')
    const request = makeRequest('http://localhost:3000/')
    const result = await proxy(request)

    expect(result.status).toBe(302)
    expect(result.headers.get('location')).toContain('/dashboard')
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
      '/((?!api(?:/|$)|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ])
  })

  it('redirects unauthenticated Spanish dashboard requests to localized login and preserves query', async () => {
    const { updateSession } = await import('@/lib/supabase/middleware')
    vi.mocked(updateSession).mockResolvedValue({
      response: mockResponse,
      user: null,
    })

    const { proxy } = await import('../proxy')
    const request = makeRequest('http://localhost:3000/es/dashboard?x=1')
    const result = await proxy(request)

    expect(result.status).toBe(302)
    expect(result.headers.get('location')).toBe(
      'http://localhost:3000/es/login?x=1'
    )
  })

  it('redirects authenticated Spanish home requests to localized dashboard', async () => {
    const { updateSession } = await import('@/lib/supabase/middleware')
    const mockUser: User = { id: 'user-123' } as User
    vi.mocked(updateSession).mockResolvedValue({
      response: mockResponse,
      user: mockUser,
    })

    const { proxy } = await import('../proxy')
    const request = makeRequest('http://localhost:3000/es')
    const result = await proxy(request)

    expect(result.status).toBe(302)
    expect(result.headers.get('location')).toBe(
      'http://localhost:3000/es/dashboard'
    )
  })

  it('passes a shared i18n response to Supabase session refresh', async () => {
    const { updateSession } = await import('@/lib/supabase/middleware')
    vi.mocked(updateSession).mockResolvedValue({
      response: mockResponse,
      user: null,
    })

    const { proxy } = await import('../proxy')
    const request = makeRequest('http://localhost:3000/es')
    await proxy(request)

    expect(vi.mocked(updateSession).mock.calls[0][1]).toBeInstanceOf(
      NextResponse
    )
  })

  it('seeds NEXT_LOCALE from the saved user language when the cookie is absent', async () => {
    const { updateSession } = await import('@/lib/supabase/middleware')
    const response = new NextResponse(null, { status: 200 })
    const mockUser = {
      id: 'user-123',
      user_metadata: { language: 'es' },
    } as unknown as User
    vi.mocked(updateSession).mockResolvedValue({ response, user: mockUser })

    const { proxy } = await import('../proxy')
    const result = await proxy(makeRequest('http://localhost:3000/dashboard'))

    expect(result.cookies.get('NEXT_LOCALE')?.value).toBe('es')
  })

  it('does not overwrite an existing NEXT_LOCALE cookie', async () => {
    const { updateSession } = await import('@/lib/supabase/middleware')
    const response = new NextResponse(null, { status: 200 })
    const mockUser = {
      id: 'user-123',
      user_metadata: { language: 'es' },
    } as unknown as User
    vi.mocked(updateSession).mockResolvedValue({ response, user: mockUser })

    const { proxy } = await import('../proxy')
    const request = new NextRequest('http://localhost:3000/dashboard', {
      headers: { cookie: 'NEXT_LOCALE=en' },
    })
    const result = await proxy(request)

    expect(result.cookies.get('NEXT_LOCALE')).toBeUndefined()
  })

  it('does not seed a locale cookie for anonymous visitors', async () => {
    const { updateSession } = await import('@/lib/supabase/middleware')
    const response = new NextResponse(null, { status: 200 })
    vi.mocked(updateSession).mockResolvedValue({ response, user: null })

    const { proxy } = await import('../proxy')
    const result = await proxy(makeRequest('http://localhost:3000/'))

    expect(result.cookies.get('NEXT_LOCALE')).toBeUndefined()
  })

  it('ignores an unsupported saved language value', async () => {
    const { updateSession } = await import('@/lib/supabase/middleware')
    const response = new NextResponse(null, { status: 200 })
    const mockUser = {
      id: 'user-123',
      user_metadata: { language: 'fr' },
    } as unknown as User
    vi.mocked(updateSession).mockResolvedValue({ response, user: mockUser })

    const { proxy } = await import('../proxy')
    const result = await proxy(makeRequest('http://localhost:3000/dashboard'))

    expect(result.cookies.get('NEXT_LOCALE')).toBeUndefined()
  })
})
