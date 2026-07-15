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
} from '@/lib/demo/fixtures'
import { demoHrefs } from '@/lib/demo/hrefs'

describe('demo fixtures', () => {
  it('validates the campaign against the production read schema', () => {
    expect(() => campaignDetailResponseSchema.parse(demoCampaign)).not.toThrow()
    expect(demoCampaign.npcs.length).toBeGreaterThan(0)
    expect(demoCampaign.factions.length).toBeGreaterThan(0)
    expect(demoCampaign.arcs.length).toBeGreaterThan(0)
  })

  it('validates the session history against the production read schema', () => {
    for (const session of demoSessions) {
      expect(() => sessionResponseSchema.parse(session)).not.toThrow()
    }
  })

  it('validates the active memories against the production read schema', () => {
    for (const fact of demoMemoryFacts) {
      expect(() => memoryFactResponseSchema.parse(fact)).not.toThrow()
      expect(fact.status).toBe('active')
    }
  })

  it('validates the Scribe suggestions against the production schema', () => {
    expect(demoMemorySuggestions.length).toBeGreaterThan(0)
    for (const suggestion of demoMemorySuggestions) {
      expect(() => memorySuggestionSchema.parse(suggestion)).not.toThrow()
    }
  })

  it('validates the generated session draft against the production schema', () => {
    expect(() => sessionDetailSchema.parse(demoGeneratedSession)).not.toThrow()
    expect(demoGeneratedSession.generated_content?.sections.length).toBe(7)
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
