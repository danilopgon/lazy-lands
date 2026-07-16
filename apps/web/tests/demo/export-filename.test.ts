import { describe, expect, it } from 'vitest'

import { demoExportFilename } from '@/lib/demo/export-filename'

describe('demoExportFilename', () => {
  it('derives an English slug from the campaign title and live session number', () => {
    expect(demoExportFilename('Shadows over Phandalin', 8, 'session')).toBe(
      'shadows-over-phandalin-session-8.pdf'
    )
  })

  it('reflects the advanced session number (log → prepare → generate)', () => {
    expect(demoExportFilename('Shadows over Phandalin', 9, 'session')).toBe(
      'shadows-over-phandalin-session-9.pdf'
    )
  })

  it('localizes the slug for Spanish and strips accents (no English "session" leaks)', () => {
    expect(demoExportFilename('Sombras sobre Phandalin', 9, 'sesión')).toBe(
      'sombras-sobre-phandalin-sesion-9.pdf'
    )
  })

  it('collapses punctuation and repeated separators into single hyphens', () => {
    expect(demoExportFilename('  A: Tale — of  Two! ', 3, 'session')).toBe(
      'a-tale-of-two-session-3.pdf'
    )
  })
})
