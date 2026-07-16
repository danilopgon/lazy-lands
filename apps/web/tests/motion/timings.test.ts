import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  CARD_EXIT_MS,
  STAMP_HOLD_MS,
  STAMP_LIFETIME_MS,
  STAMP_POP_MS,
} from '@/lib/motion/timings'

// Vitest roots at `apps/web`, so the stylesheet is addressable from the cwd.
const globalsCss = readFileSync(resolve('app/globals.css'), 'utf8')

/**
 * Read the duration declared for a keyframe animation in `globals.css`.
 *
 * @param {string} keyframeName - The `@keyframes` name referenced by the rule.
 * @returns {number} The duration in milliseconds.
 */
function cssAnimationDurationMs(keyframeName: string): number {
  const match = globalsCss.match(
    new RegExp(`animation:\\s*${keyframeName}\\s+(\\d+)ms`)
  )
  if (!match) {
    throw new Error(`No animation duration found for ${keyframeName}`)
  }
  return Number(match[1])
}

describe('memory review motion timings', () => {
  it('keeps an accepted card mounted past the end of the stamp pop', () => {
    // The regression this guards: the card used to unmount at 120ms, tearing
    // the 260ms pop down at ~46% so the stamp never reached full opacity.
    expect(STAMP_LIFETIME_MS).toBeGreaterThan(STAMP_POP_MS)
  })

  it('holds the stamp readable after the pop settles', () => {
    expect(STAMP_HOLD_MS).toBeGreaterThan(0)
    expect(STAMP_LIFETIME_MS).toBe(STAMP_POP_MS + STAMP_HOLD_MS)
  })

  it('keeps a leaving card mounted for the whole exit animation', () => {
    expect(CARD_EXIT_MS).toBeGreaterThan(0)
  })

  it('mirrors the keyframe durations declared in globals.css', () => {
    expect(cssAnimationDurationMs('ll-stamp-pop')).toBe(STAMP_POP_MS)
    expect(cssAnimationDurationMs('ll-accept-file')).toBe(CARD_EXIT_MS)
    expect(cssAnimationDurationMs('ll-discard-slide')).toBe(CARD_EXIT_MS)
  })
})
