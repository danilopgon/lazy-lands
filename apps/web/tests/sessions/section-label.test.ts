import { describe, expect, it } from 'vitest'

import { getSectionLabelMessageKey } from '@/lib/sessions/section-label'

describe('section label message key resolver', () => {
  it('maps canonical generated-section ids to stable i18n message keys', () => {
    expect(getSectionLabelMessageKey('synopsis')).toBe('synopsis')
    expect(getSectionLabelMessageKey('main_objective')).toBe('main_objective')
    expect(getSectionLabelMessageKey('twist')).toBe('twist')
    expect(getSectionLabelMessageKey('encounters')).toBe('encounters')
    expect(getSectionLabelMessageKey('faction_reactions')).toBe(
      'faction_reactions'
    )
    expect(getSectionLabelMessageKey('arc_progression')).toBe('arc_progression')
  })

  it('normalizes id casing and separators before resolving', () => {
    expect(getSectionLabelMessageKey('Main Objective')).toBe('main_objective')
    expect(getSectionLabelMessageKey('faction-reactions')).toBe(
      'faction_reactions'
    )
  })

  it('leaves unknown ids unmapped so the component can fall back to the raw label', () => {
    expect(getSectionLabelMessageKey('house_rules')).toBeNull()
    expect(getSectionLabelMessageKey(null)).toBeNull()
    expect(getSectionLabelMessageKey('')).toBeNull()
  })
})
