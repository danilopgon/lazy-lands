'use client'

import { AnimatePresence } from 'motion/react'
import type { ReactNode } from 'react'

type ExitPresenceProps = {
  children: ReactNode
  mode?: 'popLayout'
}

/**
 * Coordinate keyed list exits without owning their visual state or teardown.
 *
 * Children are expected NOT to declare an `exit` prop. They animate to their
 * terminal state through `animate` while still in their owner's state, and a
 * timer removes them. Adding `exit` here would replay a second departure and
 * stretch a child's DOM lifetime past the timer that owns it.
 *
 * @param {ExitPresenceProps} root0 - Presence props.
 * @param {ReactNode} root0.children - Keyed list motion children.
 * @param {'popLayout'} [root0.mode] - Optional immediate layout-reflow mode.
 * @returns {React.ReactElement} Thin list AnimatePresence boundary.
 */
export function ExitPresence({ children, mode }: ExitPresenceProps) {
  return (
    <AnimatePresence initial={false} mode={mode}>
      {children}
    </AnimatePresence>
  )
}
