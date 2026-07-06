import { describe, expect, it } from 'vitest'

import {
  contentSourceSchema,
  prioritySchema,
  extractedNpcSchema,
  extractedArcSchema,
  extractCampaignOutputSchema,
  extractRequestSchema,
  createNpcRequestSchema,
  createFactionRequestSchema,
  createArcRequestSchema,
  createCampaignRequestSchema,
  createCampaignResponseSchema,
} from '@/lib/campaigns/schemas'

describe('campaigns schemas (mirrors services/api schemas.py)', () => {
  it('contentSourceSchema accepts llm/edited/manual only', () => {
    expect(contentSourceSchema.safeParse('llm').success).toBe(true)
    expect(contentSourceSchema.safeParse('edited').success).toBe(true)
    expect(contentSourceSchema.safeParse('manual').success).toBe(true)
    expect(contentSourceSchema.safeParse('bogus').success).toBe(false)
  })

  it('prioritySchema accepts high/medium/low only', () => {
    expect(prioritySchema.safeParse('high').success).toBe(true)
    expect(prioritySchema.safeParse('medium').success).toBe(true)
    expect(prioritySchema.safeParse('low').success).toBe(true)
    expect(prioritySchema.safeParse('urgent').success).toBe(false)
  })

  it('extractedNpcSchema requires name/description/current_state/motivation', () => {
    const result = extractedNpcSchema.safeParse({
      name: 'Elandra',
      description: 'A wandering scholar',
      current_state: 'Injured',
      motivation: 'Find the lost tome',
      content_source: 'llm',
    })
    expect(result.success).toBe(true)
  })

  it('extractedArcSchema defaults priority to medium and content_source to llm', () => {
    const result = extractedArcSchema.safeParse({
      title: 'The Sundered Crown',
      description: 'A war of succession looms',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.priority).toBe('medium')
      expect(result.data.content_source).toBe('llm')
    }
  })

  it('extractCampaignOutputSchema parses the full extraction payload including arcs', () => {
    const payload = {
      title: 'Shadows over Phandalin',
      description: 'A frontier town beset by goblins',
      world_state: 'Uneasy calm after the goblin raids',
      npcs: [
        {
          name: 'Elandra',
          description: 'Scholar',
          current_state: 'Injured',
          motivation: 'Find the lost tome',
          content_source: 'llm',
        },
      ],
      factions: [
        {
          name: 'Redbrands',
          description: 'Local thugs',
          current_stance: 'Hostile',
          goals: 'Control the town',
          content_source: 'llm',
        },
      ],
      arcs: [
        {
          title: 'The Sundered Crown',
          description: 'A war of succession looms',
          priority: 'high',
          content_source: 'llm',
        },
      ],
    }
    const result = extractCampaignOutputSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  it('extractRequestSchema enforces 100-8000 char raw_text bound', () => {
    expect(
      extractRequestSchema.safeParse({ raw_text: 'a'.repeat(99) }).success
    ).toBe(false)
    expect(
      extractRequestSchema.safeParse({ raw_text: 'a'.repeat(100) }).success
    ).toBe(true)
    expect(
      extractRequestSchema.safeParse({ raw_text: 'a'.repeat(8000) }).success
    ).toBe(true)
    expect(
      extractRequestSchema.safeParse({ raw_text: 'a'.repeat(8001) }).success
    ).toBe(false)
  })

  it('createNpcRequestSchema requires an explicit content_source (no default)', () => {
    const result = createNpcRequestSchema.safeParse({
      name: 'Elandra',
      description: 'Scholar',
      current_state: 'Injured',
      motivation: 'Find the lost tome',
      content_source: 'edited',
    })
    expect(result.success).toBe(true)
  })

  it('createFactionRequestSchema requires an explicit content_source', () => {
    const result = createFactionRequestSchema.safeParse({
      name: 'Redbrands',
      description: 'Local thugs',
      current_stance: 'Hostile',
      goals: 'Control the town',
      content_source: 'manual',
    })
    expect(result.success).toBe(true)
  })

  it('createArcRequestSchema has no status field and requires content_source', () => {
    const result = createArcRequestSchema.safeParse({
      title: 'The Sundered Crown',
      description: 'A war of succession looms',
      priority: 'high',
      content_source: 'manual',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect('status' in result.data).toBe(false)
    }
  })

  it('createCampaignRequestSchema requires non-empty title/description/world_state', () => {
    expect(
      createCampaignRequestSchema.safeParse({
        title: '',
        description: 'x',
        world_state: 'x',
      }).success
    ).toBe(false)

    const result = createCampaignRequestSchema.safeParse({
      title: 'Shadows over Phandalin',
      description: 'A frontier town beset by goblins',
      world_state: 'Uneasy calm',
      system: 'D&D 5e',
      npcs: [],
      factions: [],
      arcs: [],
    })
    expect(result.success).toBe(true)
  })

  it('createCampaignResponseSchema requires id', () => {
    expect(createCampaignResponseSchema.safeParse({ id: 'abc' }).success).toBe(
      true
    )
    expect(createCampaignResponseSchema.safeParse({}).success).toBe(false)
  })
})
