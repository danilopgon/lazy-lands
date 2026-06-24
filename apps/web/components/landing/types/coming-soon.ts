import type { ReactNode } from 'react'

export type ComingSoonButtonVariant = 'accent' | 'secondary' | 'ink'

export type ComingSoonButtonProps = {
  children: ReactNode
  variant?: ComingSoonButtonVariant
}
