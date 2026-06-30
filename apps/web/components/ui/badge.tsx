import { cn } from '@/lib/utils'

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'accent' | 'muted'
}

/**
 * Inline status badge — accent or muted variant with monospace uppercase label.
 *
 * @param {object} root0 - The badge props, extending standard HTML span attributes.
 * @param {'accent'|'muted'} [root0.variant='muted'] - The visual variant.
 * @param {string} [root0.className] - Optional additional CSS classes to merge.
 * @returns {React.ReactElement} The badge span element.
 */
export function Badge({ variant = 'muted', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-block border-2 border-[var(--border)] px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest',
        variant === 'accent' && 'bg-[var(--accent)] text-[var(--bg-contrast)]',
        variant === 'muted' && 'bg-[var(--paper)] text-[var(--mute)]',
        className
      )}
      {...props}
    />
  )
}
