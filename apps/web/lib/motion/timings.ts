/**
 * Timings shared by the memory-review feedback choreography.
 *
 * These mirror keyframe durations declared in `app/globals.css`; the pairing is
 * asserted by `tests/motion/timings.test.ts`, which parses the stylesheet. The
 * invariant that matters is `STAMP_LIFETIME_MS > STAMP_POP_MS`: the card must
 * outlive its own stamp animation, or the DM never gets to read the stamp.
 *
 * The delays are deliberately timer-driven rather than `animationend`-driven.
 * Under `data-motion="subtle"`, `data-motion="off"`, and `prefers-reduced-motion`
 * the stamp is a static badge with no animation at all, so an animation event
 * would never fire and the card would never leave.
 */

/** Duration of the `ll-stamp-pop` keyframe. */
export const STAMP_POP_MS = 260

/**
 * How long the stamp stays put after the pop settles. Applies in every motion
 * mode: under `subtle`/`off` the stamp renders as a static badge, and reading
 * it is exactly the point — action feedback is communicative, not decorative.
 */
export const STAMP_HOLD_MS = 800

/** Duration of the `ll-accept-file` and `ll-discard-slide` exit keyframes. */
export const CARD_EXIT_MS = 220

/** Time from a successful accept until the card starts animating out. */
export const STAMP_LIFETIME_MS = STAMP_POP_MS + STAMP_HOLD_MS
