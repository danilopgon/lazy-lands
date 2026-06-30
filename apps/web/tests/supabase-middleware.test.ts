import type { CookieOptions } from '@supabase/ssr'
import { createServerClient } from '@supabase/ssr'
import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

type CookieToSet = {
  name: string
  value: string
  options?: CookieOptions
}

const supabaseCookiesToSet: CookieToSet[] = []

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn((_url, _key, options) => ({
    auth: {
      async getUser() {
        options.cookies.setAll(supabaseCookiesToSet)

        return {
          data: {
            user: { id: 'user-123' },
          },
        }
      },
    },
  })),
}))

/**
 * Build a NextRequest from a URL string for middleware tests.
 *
 * @param {string} url - The URL string to create the request from.
 * @returns {NextRequest} A NextRequest instance for use in middleware tests.
 */
function makeRequest(url: string): NextRequest {
  return new NextRequest(url)
}

describe('updateSession', () => {
  const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const originalSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalSupabaseAnonKey
    supabaseCookiesToSet.length = 0
    vi.clearAllMocks()
  })

  it('SM-007: propagates refreshed Supabase Set-Cookie headers on the returned response', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    supabaseCookiesToSet.push({
      name: 'sb-session',
      value: 'refreshed-token',
      options: {
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
      },
    })

    const { updateSession } = await import('@/lib/supabase/middleware')
    const { response, user } = await updateSession(
      makeRequest('http://localhost:3000/dashboard')
    )

    expect(createServerClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'anon-key',
      expect.objectContaining({ cookies: expect.any(Object) })
    )
    expect(user?.id).toBe('user-123')
    expect(response.headers.getSetCookie()).toEqual(
      expect.arrayContaining([
        expect.stringContaining('sb-session=refreshed-token'),
      ])
    )
  })
})
