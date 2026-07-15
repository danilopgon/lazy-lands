import { describe, expect, it } from 'vitest'

import { buildStructuredData, localeAlternates } from '@/lib/seo'

describe('localeAlternates', () => {
  it('makes the unprefixed English route canonical for the en home', () => {
    const alt = localeAlternates('/', 'en')
    expect(alt.canonical).toBe('/')
    expect(alt.languages).toEqual({ en: '/', es: '/es', 'x-default': '/' })
  })

  it('makes the /es route canonical for the es home', () => {
    const alt = localeAlternates('/', 'es')
    expect(alt.canonical).toBe('/es')
    expect(alt.languages).toEqual({ en: '/', es: '/es', 'x-default': '/' })
  })

  it('prefixes nested paths per locale and x-defaults to English', () => {
    const alt = localeAlternates('/login', 'es')
    expect(alt.canonical).toBe('/es/login')
    expect(alt.languages).toEqual({
      en: '/login',
      es: '/es/login',
      'x-default': '/login',
    })
  })
})

describe('buildStructuredData', () => {
  const input = {
    name: 'Lazy Lands',
    description: 'A companion for tabletop RPG campaigns.',
    siteUrl: 'https://lazylands.app',
    locale: 'en' as const,
  }

  it('emits a WebSite, Organization, and SoftwareApplication graph', () => {
    const data = buildStructuredData(input)
    const graph = data['@graph'] as Array<Record<string, unknown>>
    const types = graph.map((node) => node['@type'])

    expect(data['@context']).toBe('https://schema.org')
    expect(types).toEqual(['WebSite', 'Organization', 'SoftwareApplication'])
  })

  it('describes the tabletop-RPG software application with verifiable fields only', () => {
    const graph = buildStructuredData(input)['@graph'] as Array<
      Record<string, unknown>
    >
    const app = graph.find((n) => n['@type'] === 'SoftwareApplication')!

    expect(app.name).toBe('Lazy Lands')
    expect(app.applicationCategory).toBe('GameApplication')
    expect(app.operatingSystem).toBe('Web browser')
    // No unverifiable commercial claims may leak into structured data.
    expect(app).not.toHaveProperty('offers')
    expect(app).not.toHaveProperty('aggregateRating')
    expect(app).not.toHaveProperty('review')
  })

  it('cross-references the organization as publisher via @id', () => {
    const graph = buildStructuredData(input)['@graph'] as Array<
      Record<string, unknown>
    >
    const org = graph.find((n) => n['@type'] === 'Organization')!
    const site = graph.find((n) => n['@type'] === 'WebSite')!

    expect((site.publisher as { '@id': string })['@id']).toBe(org['@id'])
  })
})
