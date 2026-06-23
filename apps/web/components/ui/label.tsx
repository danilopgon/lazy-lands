import * as React from 'react'

import { cn } from '@/lib/utils'

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    className={cn(
      'font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[var(--mute)]',
      className
    )}
    ref={ref}
    {...props}
  />
))
Label.displayName = 'Label'
