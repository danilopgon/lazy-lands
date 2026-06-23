import * as React from 'react'

import { cn } from '@/lib/utils'

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    className={cn(
      'flex h-11 w-full border-2 border-[var(--border)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] shadow-none file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--ink-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    ref={ref}
    {...props}
  />
))
Input.displayName = 'Input'
