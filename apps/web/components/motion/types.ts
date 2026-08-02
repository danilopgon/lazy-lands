import type { ReactNode } from 'react'

/** Props for the keyed-list presence boundary. */
export type ExitPresenceProps = {
  children: ReactNode
  /** Immediate layout reflow, so siblings settle without waiting on the exit. */
  mode?: 'popLayout'
}

/** Props for the modal presence boundary. */
export type ModalPresenceProps = {
  children: ReactNode
  open: boolean
}
