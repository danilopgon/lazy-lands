import type { ComponentProps } from 'react'

import type { Link } from '@/i18n/navigation'

export type LocaleLinkProps = ComponentProps<typeof Link>

/** Props for the pending-aware application link. */
export type NavLinkProps = LocaleLinkProps & {
  /** Overrides the default screen-reader announcement while navigating. */
  pendingLabel?: string
  /** Absolute placement for block-level links, whose box an inline slot grows. */
  pendingSlotClassName?: string
}

/** Props for the status reader rendered inside the link. */
export type LinkPendingProps = {
  label: string
  slotClassName: string
}
