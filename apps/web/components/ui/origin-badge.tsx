import { cn } from '@/lib/utils'

type OriginBadgeProps = {
  origin: 'scribe' | 'edited'
  className?: string
}

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
