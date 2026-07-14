import { describe, expect, it, vi } from 'vitest'

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
      value: expect.stringContaining(
        "connect-src 'self' https: http: wss: ws:"
      ),
    })
  })
})
