import type { User } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

import { decideAuth } from '@/lib/auth/decide'

describe('decideAuth', () => {
  const authenticatedUser: User = { id: 'x' } as User

  it('SM-T-01: redirects unauthenticated user from /dashboard', () => {
    expect(decideAuth(null, '/dashboard')).toBe('redirect')
  })

  it('SM-T-02: passes through authenticated user on /dashboard', () => {
    expect(decideAuth(authenticatedUser, '/dashboard')).toBe('passthrough')
  })

  it('SM-T-03: passes through unauthenticated user on /', () => {
    expect(decideAuth(null, '/')).toBe('passthrough')
  })

  it('SM-T-04: passes through unauthenticated user on /login', () => {
    expect(decideAuth(null, '/login')).toBe('passthrough')
  })

  it('SM-T-05: passes through unauthenticated user on /forgot-password', () => {
    expect(decideAuth(null, '/forgot-password')).toBe('passthrough')
  })

  it('SM-T-06: passes through unauthenticated user on /auth/confirm', () => {
    expect(decideAuth(null, '/auth/confirm')).toBe('passthrough')
  })

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
