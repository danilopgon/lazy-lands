import * as React from 'react'

import { cn } from '@/lib/utils'

type EmptyStateProps = React.HTMLAttributes<HTMLDivElement> & {
  title: string
  description: string
  action?: React.ReactNode
  ornament?: React.ReactNode
}

export function EmptyState({
  title,
  description,
  action,
  ornament = '❧',
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'border-2 border-[var(--border)] bg-[var(--paper)] px-6 py-10 text-center shadow-[6px_6px_0_var(--shadow)]',
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="mb-3 block text-3xl leading-none text-[var(--accent)]"
      >
        {ornament}
      </span>
      <h2 className="font-serif text-2xl font-semibold tracking-[-0.015em] text-[var(--ink)]">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-[42ch] text-sm leading-relaxed text-[var(--ink-2)]">
        {description}
      </p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  )
}
