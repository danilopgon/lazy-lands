import type { User } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

import { decideAuth } from '@/lib/auth/decide'

// SM-T-01..07: decideAuth pure-function contract
describe('decideAuth', () => {
  const authenticatedUser: User = { id: 'x' } as User

  // SM-T-01: unauthenticated request to a protected route → redirect
  it('SM-T-01: redirects unauthenticated user from /dashboard', () => {
    expect(decideAuth(null, '/dashboard')).toBe('redirect')
  })

  // SM-T-02: authenticated user on protected route → passthrough
  it('SM-T-02: passes through authenticated user on /dashboard', () => {
    expect(decideAuth(authenticatedUser, '/dashboard')).toBe('passthrough')
  })

  // SM-T-03: unauthenticated on root → passthrough
  it('SM-T-03: passes through unauthenticated user on /', () => {
    expect(decideAuth(null, '/')).toBe('passthrough')
  })

  // SM-T-04: unauthenticated on /login → passthrough
  it('SM-T-04: passes through unauthenticated user on /login', () => {
    expect(decideAuth(null, '/login')).toBe('passthrough')
  })

  // SM-T-05: unauthenticated on /forgot-password → passthrough
  it('SM-T-05: passes through unauthenticated user on /forgot-password', () => {
    expect(decideAuth(null, '/forgot-password')).toBe('passthrough')
  })

  // SM-T-06: unauthenticated on /auth/confirm → passthrough
  it('SM-T-06: passes through unauthenticated user on /auth/confirm', () => {
    expect(decideAuth(null, '/auth/confirm')).toBe('passthrough')
  })

  // SM-T-07: unauthenticated on /auth/reset → passthrough
  it('SM-T-07: passes through unauthenticated user on /auth/reset', () => {
    expect(decideAuth(null, '/auth/reset')).toBe('passthrough')
  })

  it.each(['/register', '/privacy', '/cookies'])(
    'SM-004: passes through unauthenticated user on public route %s',
    (pathname) => {
      expect(decideAuth(null, pathname)).toBe('passthrough')
    }
  )
})
