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
