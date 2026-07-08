import { describe, expect, it } from 'vitest'

import { userInitials } from '@/lib/user/initials'

describe('userInitials', () => {
  it('takes the first two letters of a single-segment local part', () => {
    expect(userInitials('contacto@danilopgon.com')).toBe('CO')
  })

  it('takes the first letter of the first two separator-split segments', () => {
    expect(userInitials('dani.perez@example.com')).toBe('DP')
    expect(userInitials('a_b_c@example.com')).toBe('AB')
  })

  it('uppercases the initials', () => {
    expect(userInitials('zoe@example.com')).toBe('ZO')
  })

  it('falls back to ? for a missing or empty email', () => {
    expect(userInitials(null)).toBe('?')
    expect(userInitials(undefined)).toBe('?')
    expect(userInitials('')).toBe('?')
    expect(userInitials('@example.com')).toBe('?')
  })
})
