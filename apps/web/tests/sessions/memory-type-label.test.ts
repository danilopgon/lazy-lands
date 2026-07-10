import { describe, expect, it } from 'vitest'

import {
  getMemoryTypeMessageKey,
  humanizeMemoryType,
} from '@/lib/sessions/memory-type-label'

describe('memory type label helpers', () => {
  it('maps canonical and legacy relationship variants to the same message key', () => {
    expect(getMemoryTypeMessageKey('relationship')).toBe('relationship')
    expect(getMemoryTypeMessageKey('Faction Relationship')).toBe('relationship')
    expect(getMemoryTypeMessageKey('faction-relationship')).toBe('relationship')
  })

  it('maps legacy memory type variants the describe-review flow produced to canonical keys', () => {
    expect(getMemoryTypeMessageKey('Story Arc Progress')).toBe('arc_progress')
    expect(getMemoryTypeMessageKey('NPC Revelation')).toBe('revelation')
    expect(getMemoryTypeMessageKey('Reputation')).toBe('reputation')
    expect(getMemoryTypeMessageKey('World State Change')).toBe(
      'world_state_change'
    )
    expect(getMemoryTypeMessageKey('Item')).toBe('item')
  })

  it('normalizes known memory type strings and leaves unknown types as readable fallback copy', () => {
    expect(getMemoryTypeMessageKey('Arc Progress')).toBe('arc_progress')
    expect(getMemoryTypeMessageKey('old prophecy')).toBeNull()
    expect(humanizeMemoryType('old_prophecy')).toBe('Old prophecy')
  })
})
