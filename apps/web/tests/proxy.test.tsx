import { describe, expect, it, vi } from 'vitest'
import { type NextRequest } from 'next/server'

vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: vi.fn((request: Request) => ({ handledRequest: request })),
}))

describe('Next.js proxy session refresh', () => {
  it('exports proxy and delegates session refresh to updateSession', async () => {
    const request = new Request(
      'http://localhost:3000/dashboard'
    ) as unknown as NextRequest
    const { proxy } = await import('../proxy')

    await expect(proxy(request)).resolves.toEqual({ handledRequest: request })
  })

  it('preserves the existing matcher exclusions', async () => {
    const { config } = await import('../proxy')

    expect(config.matcher).toEqual([
      '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ])
  })
})
