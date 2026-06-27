import * as React from 'react'

import { cn } from '@/lib/utils'

type NoticeProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'scribe' | 'error' | 'plain'
  ornament?: React.ReactNode
}

export function Notice({
  className,
  variant = 'scribe',
  ornament = '✦',
  children,
  ...props
}: NoticeProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 border-2 border-[var(--border)] p-4',
        variant === 'scribe' &&
          'bg-[var(--ink)] text-[var(--bg)] shadow-[4px_4px_0_var(--accent)]',
        variant === 'error' &&
          'border-[var(--danger)] bg-[var(--danger-wash)] text-[var(--danger)] shadow-[4px_4px_0_var(--danger)]',
        variant === 'plain' && 'bg-[var(--paper)] text-[var(--ink-2)]',
        className
      )}
      {...props}
    >
      {ornament ? (
        <span
          aria-hidden="true"
          className={cn(
            'shrink-0 text-lg leading-none',
            variant === 'scribe' && 'text-[var(--accent)]'
          )}
        >
          {ornament}
        </span>
      ) : null}
      <div className="min-w-0 text-sm leading-relaxed">{children}</div>
    </div>
  )
}
