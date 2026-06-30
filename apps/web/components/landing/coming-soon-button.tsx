'use client'

import { useId } from 'react'

import type { ComingSoonButtonProps } from './types'

/**
 * Disabled button with a "Coming soon" tooltip — used for unreleased CTAs.
 *
 * @param {object} root0 - The coming soon button props.
 * @param {React.ReactNode} root0.children - The button label content.
 * @param {'accent'|'secondary'|'ink'} [root0.variant='secondary'] - The visual variant.
 * @returns {React.ReactElement} The disabled button element with tooltip.
 */
export function ComingSoonButton({
  children,
  variant = 'secondary',
}: ComingSoonButtonProps) {
  const id = useId()

  const variantClasses = {
    accent: 'border-[var(--border)] bg-[var(--accent)] !text-[var(--paper)]',
    secondary: 'bg-[var(--paper)] text-[var(--ink)] border-[var(--border)]',
    ink: 'bg-[var(--ink)] text-[var(--bg)] border-[var(--border)]',
  }

  return (
    <span className="group relative inline-flex">
      <button
        aria-disabled="true"
        aria-describedby={id}
        tabIndex={0}
        onClick={(e) => e.preventDefault()}
        className={[
          'inline-flex items-center justify-center whitespace-nowrap',
          'border-2 font-sans text-sm font-semibold',
          'shadow-[3px_3px_0_var(--shadow)]',
          'cursor-not-allowed opacity-70',
          'h-11 px-5 py-2',
          variantClasses[variant],
        ].join(' ')}
      >
        {children}
      </button>
      <span
        role="tooltip"
        id={id}
        className={[
          'pointer-events-none absolute bottom-full left-1/2 mb-2',
          '-translate-x-1/2',
          'whitespace-nowrap',
          'border-2 border-[var(--border)] bg-[var(--ink)] px-2 py-1',
          'font-mono text-xs text-[var(--bg)]',
          'opacity-0',
          'group-hover:opacity-100 group-focus-within:opacity-100',
          'transition-opacity duration-150',
        ].join(' ')}
      >
        Coming soon
      </span>
    </span>
  )
}
