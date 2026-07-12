import { describe, expect, it } from 'vitest'

import { getSectionLabelMessageKey } from '@/lib/sessions/section-label'

describe('section label message key resolver', () => {
  it('maps the 7 canonical generated-section ids to stable i18n message keys', () => {
    expect(getSectionLabelMessageKey('synopsis')).toBe('synopsis')
    expect(getSectionLabelMessageKey('goal')).toBe('goal')
    expect(getSectionLabelMessageKey('opening')).toBe('opening')
    expect(getSectionLabelMessageKey('beats')).toBe('beats')
    expect(getSectionLabelMessageKey('encounters')).toBe('encounters')
    expect(getSectionLabelMessageKey('factions')).toBe('factions')
    expect(getSectionLabelMessageKey('arcs')).toBe('arcs')
  })

  it('normalizes id casing and separators before resolving', () => {
    expect(getSectionLabelMessageKey('Opening')).toBe('opening')
    expect(getSectionLabelMessageKey('main-beats')).toBeNull()
  })

  it('leaves unknown or retired ids unmapped so the component falls back to the raw label', () => {
    expect(getSectionLabelMessageKey('house_rules')).toBeNull()
    // Retired flat fields must never resolve as canonical sections again.
    expect(getSectionLabelMessageKey('main_objective')).toBeNull()
    expect(getSectionLabelMessageKey('twist')).toBeNull()
    expect(getSectionLabelMessageKey('faction_reactions')).toBeNull()
    expect(getSectionLabelMessageKey('arc_progression')).toBeNull()
    expect(getSectionLabelMessageKey(null)).toBeNull()
    expect(getSectionLabelMessageKey('')).toBeNull()
  })
})
