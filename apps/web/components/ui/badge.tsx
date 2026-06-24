import { cn } from '@/lib/utils'

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'accent' | 'muted'
}

export function Badge({ variant = 'muted', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-block border-2 border-[var(--border)] px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest',
        variant === 'accent' && 'bg-[var(--accent)] text-[#fbf4ec]',
        variant === 'muted' && 'bg-[var(--paper)] text-[var(--mute)]',
        className
      )}
      {...props}
    />
  )
}
