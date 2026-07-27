'use client'

import { AnimatePresence } from 'motion/react'
import type { ReactNode } from 'react'

type ModalPresenceProps = {
  children: ReactNode
  open: boolean
}

/**
 * Keep modal children present long enough for their Motion exit transitions.
 *
 * @param {ModalPresenceProps} root0 - Presence props.
 * @param {ReactNode} root0.children - Keyed modal motion tree.
 * @param {boolean} root0.open - Whether the modal tree is present.
 * @returns {React.ReactElement} Thin modal AnimatePresence boundary.
 */
export function ModalPresence({ children, open }: ModalPresenceProps) {
  return (
    <AnimatePresence initial={false}>{open ? children : null}</AnimatePresence>
  )
}
