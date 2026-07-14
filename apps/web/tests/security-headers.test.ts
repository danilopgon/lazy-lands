import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next-intl/plugin', () => ({
  default: () => (config: unknown) => config,
}))

type ConfigWithHeaders = {
  headers?: () => Promise<
    {
      headers: { key: string; value: string }[]
      source: string
    }[]
  >
}

describe('browser security headers', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('applies CSP and protective headers to every Next.js route', async () => {
    const { default: config } = await import('../next.config')
    const headers = await (config as ConfigWithHeaders).headers?.()

    expect(headers).toHaveLength(1)
    if (!headers) {
      throw new Error('Security headers must be configured')
    }
    expect(headers[0].source).toBe('/:path*')
    expect(
      Object.fromEntries(
        headers[0].headers.map(({ key, value }) => [key, value])
      )
    ).toMatchObject({
      'Content-Security-Policy': expect.stringContaining(
        "frame-ancestors 'none'"
      ),
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), geolocation=(), microphone=()',
    })
    expect(headers[0].headers).toContainEqual({
      key: 'Content-Security-Policy',
      value: expect.stringContaining("connect-src 'self'"),
    })
  })

  it('limits connect-src to valid configured API and Supabase origins', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.lazy-lands.test/v1')
    vi.stubEnv(
      'NEXT_PUBLIC_SUPABASE_URL',
      'http://supabase.lazy-lands.test:54321'
    )

    const { default: config } = await import('../next.config')
    const headers = await (config as ConfigWithHeaders).headers?.()
    const csp = headers?.[0].headers.find(
      ({ key }) => key === 'Content-Security-Policy'
    )?.value

    expect(csp).toContain(
      "connect-src 'self' https://api.lazy-lands.test http://supabase.lazy-lands.test:54321"
    )
    expect(csp).not.toMatch(
      /connect-src[^;]*\b(?:https|http|wss|ws):(?:\s|;|$)/
    )
  })

  it('omits absent or unsafe configured connect-src values', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'javascript:alert(1)')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'not a URL')

    const { default: config } = await import('../next.config')
    const headers = await (config as ConfigWithHeaders).headers?.()
    const csp = headers?.[0].headers.find(
      ({ key }) => key === 'Content-Security-Policy'
    )?.value

    expect(csp).toContain("connect-src 'self'")
    expect(csp).not.toContain('javascript:')
    expect(csp).not.toContain('not a URL')
  })
})
