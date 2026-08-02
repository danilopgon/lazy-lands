export const DURATION = {
  instant: 0,
  fast: 0.14,
  base: 0.22,
  slow: 0.26,
} as const

export const EASE = {
  out: [0.16, 1, 0.3, 1],
  in: [0.4, 0, 1, 1],
} as const

export const STAGGER = {
  tight: 0.04,
  base: 0.06,
} as const

/** Grace before a navigation is shown as pending. */
export const NAV_PENDING_DELAY_MS = 150
