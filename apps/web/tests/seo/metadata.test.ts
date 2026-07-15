import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import manifest from '@/app/manifest'
import robots from '@/app/robots'
import sitemap from '@/app/sitemap'
import { getSiteUrl, isProductionDeploy } from '@/lib/site'

const ENV_KEYS = [
  'NEXT_PUBLIC_APP_URL',
  'VERCEL_PROJECT_PRODUCTION_URL',
  'VERCEL_URL',
  'VERCEL_ENV',
] as const

const saved: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key]
    delete process.env[key]
  }
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
})

describe('getSiteUrl', () => {
  it('prefers NEXT_PUBLIC_APP_URL and strips the trailing slash', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://lazylands.app/'
    expect(getSiteUrl()).toBe('https://lazylands.app')
  })

  it('prepends https to the host-only Vercel production URL', () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'lazy-lands.vercel.app'
    expect(getSiteUrl()).toBe('https://lazy-lands.vercel.app')
  })

  it('ignores VERCEL_URL (per-deploy host) and falls back to localhost', () => {
    process.env.VERCEL_URL = 'deploy-abc123.vercel.app'
    expect(getSiteUrl()).toBe('http://localhost:3000')
  })
})

describe('isProductionDeploy', () => {
  it('is true only when VERCEL_ENV is production', () => {
    process.env.VERCEL_ENV = 'production'
    expect(isProductionDeploy()).toBe(true)

    process.env.VERCEL_ENV = 'preview'
    expect(isProductionDeploy()).toBe(false)

    delete process.env.VERCEL_ENV
    expect(isProductionDeploy()).toBe(false)
  })
})

describe('robots', () => {
  it('disallows everything on non-production deploys', () => {
    const result = robots()
    expect(result.rules).toEqual({ userAgent: '*', disallow: '/' })
    expect(result.sitemap).toBeUndefined()
  })

  it('allows public and disallows private paths in both locales in production', () => {
    process.env.VERCEL_ENV = 'production'
    process.env.NEXT_PUBLIC_APP_URL = 'https://lazylands.app'

    const result = robots()
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules

    expect(rule?.allow).toBe('/')
    for (const path of [
      '/dashboard',
      '/es/dashboard',
      '/campaigns',
      '/es/campaigns',
      '/es/auth',
      '/forgot-password',
    ]) {
      expect(rule?.disallow).toContain(path)
    }
    expect(result.sitemap).toBe('https://lazylands.app/sitemap.xml')
    expect(result.host).toBe('https://lazylands.app')
  })

  it('blocks the GPTBot training crawler while allowing search crawlers', () => {
    process.env.VERCEL_ENV = 'production'
    process.env.NEXT_PUBLIC_APP_URL = 'https://lazylands.app'

    const rules = robots().rules
    const list = Array.isArray(rules) ? rules : [rules]

    const asAgents = (ua: string | string[] | undefined) =>
      Array.isArray(ua) ? ua : ua ? [ua] : []

    const searchRule = list.find((rule) =>
      asAgents(rule.userAgent).includes('OAI-SearchBot')
    )
    expect(searchRule?.allow).toBe('/')

    const gptBotRule = list.find((rule) =>
      asAgents(rule.userAgent).includes('GPTBot')
    )
    expect(gptBotRule?.disallow).toBe('/')
    // GPTBot must not appear in an allow group.
    expect(asAgents(searchRule?.userAgent)).not.toContain('GPTBot')
  })
})

describe('sitemap', () => {
  it('lists only the indexable landing with en/es alternates', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://lazylands.app'

    const entries = sitemap()
    const urls = entries.map((entry) => entry.url)
    expect(urls).toContain('https://lazylands.app/')
    // Legal pages are noindex, so they must not appear in the sitemap.
    expect(urls).not.toContain('https://lazylands.app/privacy')
    expect(urls).not.toContain('https://lazylands.app/cookies')

    const home = entries.find((entry) => entry.url === 'https://lazylands.app/')
    expect(home?.alternates?.languages).toEqual({
      en: 'https://lazylands.app/',
      es: 'https://lazylands.app/es',
    })
  })
})

describe('manifest', () => {
  it('declares the brand name, theme color, and a scalable icon', () => {
    const result = manifest()
    expect(result.name).toBe('Lazy Lands')
    expect(result.theme_color).toBe('#F2ECE0')
    expect(result.icons?.[0]?.src).toBe('/icon.svg')
  })
})
