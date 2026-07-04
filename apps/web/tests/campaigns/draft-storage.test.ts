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

  it('round-trips a saved draft through sessionStorage', () => {
    saveExtractionDraft(sample)
    expect(readExtractionDraft()).toEqual(sample)
  })

  it('returns null when no draft has been saved', () => {
    expect(readExtractionDraft()).toBeNull()
  })

  it('returns null and does not throw when stored JSON is malformed', () => {
    sessionStorage.setItem('lazy-lands:campaign-extraction-draft', '{not json')
    expect(readExtractionDraft()).toBeNull()
  })

  it('clearExtractionDraft removes the stored draft', () => {
    saveExtractionDraft(sample)
    clearExtractionDraft()
    expect(readExtractionDraft()).toBeNull()
  })
})
