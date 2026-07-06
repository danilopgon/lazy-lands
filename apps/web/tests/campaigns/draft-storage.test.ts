import { afterEach, describe, expect, it } from 'vitest'

import {
  saveExtractionDraft,
  readExtractionDraft,
  clearExtractionDraft,
} from '@/lib/campaigns/draft-storage'
import type { ExtractCampaignOutput } from '@/lib/campaigns/schemas'

const sample: ExtractCampaignOutput = {
  title: 'Shadows over Phandalin',
  description: 'A frontier town beset by goblins',
  world_state: 'Uneasy calm',
  npcs: [],
  factions: [],
  arcs: [],
}

describe('campaign extraction draft storage (NFR-CUI-2 — no server draft)', () => {
  afterEach(() => {
    sessionStorage.clear()
  })

  it('round-trips a saved draft with system/tone through sessionStorage', () => {
    saveExtractionDraft(sample, { system: 'D&D 5e', tone: 'Grim survival' })
    expect(readExtractionDraft()).toEqual({
      ...sample,
      system: 'D&D 5e',
      tone: 'Grim survival',
    })
  })

  it('stores tone as null when the DM left it blank', () => {
    saveExtractionDraft(sample, { system: 'D&D 5e' })
    expect(readExtractionDraft()).toEqual({
      ...sample,
      system: 'D&D 5e',
      tone: null,
    })
  })

  it('returns null when no draft has been saved', () => {
    expect(readExtractionDraft()).toBeNull()
  })

  it('returns null and does not throw when stored JSON is malformed', () => {
    sessionStorage.setItem('lazy-lands:campaign-extraction-draft', '{not json')
    expect(readExtractionDraft()).toBeNull()
  })

  it('returns null when a legacy draft lacks system', () => {
    sessionStorage.setItem(
      'lazy-lands:campaign-extraction-draft',
      JSON.stringify(sample)
    )
    expect(readExtractionDraft()).toBeNull()
  })

  it('clearExtractionDraft removes the stored draft', () => {
    saveExtractionDraft(sample, { system: 'D&D 5e' })
    clearExtractionDraft()
    expect(readExtractionDraft()).toBeNull()
  })
})
