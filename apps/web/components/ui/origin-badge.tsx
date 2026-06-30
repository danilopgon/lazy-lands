import { cn } from '@/lib/utils'

type OriginBadgeProps = {
  origin: 'scribe' | 'edited'
  className?: string
}

/**
 * Tiny label indicating whether content originated from the Scribe or was edited by the user.
 *
 * @param {object} root0 - The origin badge props.
 * @param {'scribe'|'edited'} root0.origin - The content origin.
 * @param {string} [root0.className] - Optional additional CSS classes to merge.
 * @returns {React.ReactElement} The origin badge element.
 */
export function OriginBadge({ origin, className }: OriginBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.07em]',
        origin === 'scribe' ? 'text-[var(--accent)]' : 'text-[var(--mute)]',
        className
      )}
    >
      {origin === 'scribe' ? '✦ Scribe' : '✎ Edited by you'}
    </span>
  )
}
