import * as React from 'react'

import { cn } from '@/lib/utils'

type NoticeProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'scribe' | 'error' | 'plain'
  ornament?: React.ReactNode
}

/**
 * Callout box — scribe (dark), error (red), or plain variant with optional ornament icon.
 *
 * @param {object} root0 - The notice props, extending standard HTML div attributes.
 * @param {string} [root0.className] - Optional additional CSS classes to merge.
 * @param {'scribe'|'error'|'plain'} [root0.variant='scribe'] - The visual variant.
 * @param {React.ReactNode} [root0.ornament] - Optional decorative icon before the content (default: star).
 * @param {React.ReactNode} root0.children - The notice body content.
 * @returns {React.ReactElement} The notice callout element.
 */
export function Notice({
  className,
  variant = 'scribe',
  ornament = '✦',
  children,
  ...props
}: NoticeProps): React.ReactElement {
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
