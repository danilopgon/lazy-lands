import { describe, expect, it } from 'vitest'

import { campaignDetailResponseSchema } from '@/lib/campaigns/schemas'
import { memoryFactResponseSchema } from '@/lib/memory/schemas'
import {
  memorySuggestionSchema,
  sessionDetailSchema,
  sessionResponseSchema,
} from '@/lib/sessions/schemas'
import {
  demoCampaign,
  demoGeneratedSession,
  demoMemoryFacts,
  demoMemorySuggestions,
  demoSessions,
  fixturesByLocale,
  getDemoFixtures,
} from '@/lib/demo/fixtures'
import { demoHrefs } from '@/lib/demo/hrefs'

const LOCALES = ['en', 'es'] as const

describe('demo fixtures — schema validation, per locale', () => {
  for (const locale of LOCALES) {
    const fixtures = fixturesByLocale[locale]

    it(`[${locale}] validates the campaign against the production read schema`, () => {
      expect(() =>
        campaignDetailResponseSchema.parse(fixtures.campaign)
      ).not.toThrow()
      expect(fixtures.campaign.npcs.length).toBeGreaterThan(0)
      expect(fixtures.campaign.factions.length).toBeGreaterThan(0)
      expect(fixtures.campaign.arcs.length).toBeGreaterThan(0)
    })

    it(`[${locale}] validates the session history against the production read schema`, () => {
      for (const session of fixtures.sessions) {
        expect(() => sessionResponseSchema.parse(session)).not.toThrow()
      }
    })

    it(`[${locale}] validates the active memories against the production read schema`, () => {
      for (const fact of fixtures.memoryFacts) {
        expect(() => memoryFactResponseSchema.parse(fact)).not.toThrow()
        expect(fact.status).toBe('active')
      }
    })

    it(`[${locale}] validates the Scribe suggestions against the production schema`, () => {
      expect(fixtures.suggestions.length).toBeGreaterThan(0)
      for (const suggestion of fixtures.suggestions) {
        expect(() => memorySuggestionSchema.parse(suggestion)).not.toThrow()
      }
    })

    it(`[${locale}] validates the generated session draft against the production schema`, () => {
      expect(() => sessionDetailSchema.parse(fixtures.generated)).not.toThrow()
      expect(fixtures.generated.generated_content?.sections.length).toBe(7)
    })
  }
})

describe('demo fixtures — locale parity', () => {
  it('shares the exact same campaign id across locales', () => {
    expect(fixturesByLocale.en.campaign.id).toBe(
      fixturesByLocale.es.campaign.id
    )
  })

  it('shares the exact same NPC id set across locales', () => {
    const enIds = fixturesByLocale.en.campaign.npcs.map((npc) => npc.id).sort()
    const esIds = fixturesByLocale.es.campaign.npcs.map((npc) => npc.id).sort()
    expect(esIds).toEqual(enIds)
  })

  it('shares the exact same faction id set across locales', () => {
    const enIds = fixturesByLocale.en.campaign.factions
      .map((faction) => faction.id)
      .sort()
    const esIds = fixturesByLocale.es.campaign.factions
      .map((faction) => faction.id)
      .sort()
    expect(esIds).toEqual(enIds)
  })

  it('shares the exact same arc id set across locales', () => {
    const enIds = fixturesByLocale.en.campaign.arcs.map((arc) => arc.id).sort()
    const esIds = fixturesByLocale.es.campaign.arcs.map((arc) => arc.id).sort()
    expect(esIds).toEqual(enIds)
  })

  it('shares the exact same session id set across locales', () => {
    const enIds = fixturesByLocale.en.sessions
      .map((session) => session.id)
      .sort()
    const esIds = fixturesByLocale.es.sessions
      .map((session) => session.id)
      .sort()
    expect(esIds).toEqual(enIds)
  })

  it('shares the exact same memory fact id set across locales', () => {
    const enIds = fixturesByLocale.en.memoryFacts.map((fact) => fact.id).sort()
    const esIds = fixturesByLocale.es.memoryFacts.map((fact) => fact.id).sort()
    expect(esIds).toEqual(enIds)
  })

  it('keeps stable non-prose fields (content_source, system, tone, enums) identical across locales', () => {
    expect(fixturesByLocale.es.campaign.system).toBe(
      fixturesByLocale.en.campaign.system
    )
    expect(fixturesByLocale.es.campaign.tone).toBe(
      fixturesByLocale.en.campaign.tone
    )
    for (let i = 0; i < fixturesByLocale.en.campaign.npcs.length; i += 1) {
      expect(fixturesByLocale.es.campaign.npcs[i]?.content_source).toBe(
        fixturesByLocale.en.campaign.npcs[i]?.content_source
      )
    }
    for (let i = 0; i < fixturesByLocale.en.campaign.arcs.length; i += 1) {
      expect(fixturesByLocale.es.campaign.arcs[i]?.priority).toBe(
        fixturesByLocale.en.campaign.arcs[i]?.priority
      )
      expect(fixturesByLocale.es.campaign.arcs[i]?.status).toBe(
        fixturesByLocale.en.campaign.arcs[i]?.status
      )
    }
    for (let i = 0; i < fixturesByLocale.en.memoryFacts.length; i += 1) {
      expect(fixturesByLocale.es.memoryFacts[i]?.type).toBe(
        fixturesByLocale.en.memoryFacts[i]?.type
      )
      expect(fixturesByLocale.es.memoryFacts[i]?.importance).toBe(
        fixturesByLocale.en.memoryFacts[i]?.importance
      )
    }
  })

  it('every continuity_links.memory_fact_id resolves to a present memory id, identically across locales', () => {
    for (const locale of LOCALES) {
      const fixtures = fixturesByLocale[locale]
      const memoryIds = new Set(fixtures.memoryFacts.map((fact) => fact.id))
      const links = fixtures.generated.generated_content?.continuity_links ?? []
      expect(links.length).toBeGreaterThan(0)
      for (const link of links) {
        expect(memoryIds.has(link.memory_fact_id)).toBe(true)
      }
    }
    const enLinkIds = (
      fixturesByLocale.en.generated.generated_content?.continuity_links ?? []
    )
      .map((link) => link.memory_fact_id)
      .sort()
    const esLinkIds = (
      fixturesByLocale.es.generated.generated_content?.continuity_links ?? []
    )
      .map((link) => link.memory_fact_id)
      .sort()
    expect(esLinkIds).toEqual(enLinkIds)
  })

  it('actually translates prose between locales (sanity — es campaign title differs from en)', () => {
    expect(fixturesByLocale.es.campaign.title).not.toBe(
      fixturesByLocale.en.campaign.title
    )
    expect(fixturesByLocale.es.campaign.description).not.toBe(
      fixturesByLocale.en.campaign.description
    )
  })

  it('falls back to en for an unknown locale', () => {
    expect(getDemoFixtures('fr')).toBe(fixturesByLocale.en)
  })

  it('getDemoFixtures resolves the matching locale bundle', () => {
    expect(getDemoFixtures('es')).toBe(fixturesByLocale.es)
    expect(getDemoFixtures('en')).toBe(fixturesByLocale.en)
  })
})

describe('demo fixtures — backward-compatible en defaults', () => {
  it('exposes the legacy top-level exports as the en bundle', () => {
    expect(demoCampaign).toBe(fixturesByLocale.en.campaign)
    expect(demoSessions).toBe(fixturesByLocale.en.sessions)
    expect(demoMemoryFacts).toBe(fixturesByLocale.en.memoryFacts)
    expect(demoMemorySuggestions).toBe(fixturesByLocale.en.suggestions)
    expect(demoGeneratedSession).toBe(fixturesByLocale.en.generated)
  })
})

describe('demo hrefs', () => {
  it('never links to an authenticated route', () => {
    const authPrefixes = ['/dashboard', '/campaigns', '/login', '/register']
    for (const href of Object.values(demoHrefs)) {
      const escapesToAuth = authPrefixes.some((prefix) =>
        href.startsWith(prefix)
      )
      expect(escapesToAuth, `unexpected protected href: ${href}`).toBe(false)
    }
  })

  it('keeps every in-app link under /demo (home is the only exception)', () => {
    for (const [key, href] of Object.entries(demoHrefs)) {
      if (key === 'home') {
        expect(href).toBe('/')
        continue
      }
      expect(href.startsWith('/demo')).toBe(true)
    }
  })
})
