'use client'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type EntitySearchProps = {
  /** Current query text. */
  value: string
  /** Called with the next query text. */
  onChange: (value: string) => void
  /** Placeholder and accessible label for the input (the ellipsis is appended). */
  placeholder: string
  /** Pre-formatted "{visible} of {total}" counter. */
  countLabel: string
  className?: string
}

/**
 * Client-side text search for an entity list: an input plus a live "X of Y"
 * counter. Presentational only; the owning page holds the query state and
 * applies the filter. Mirrors the dashboard campaign search so the two search
 * surfaces feel identical.
 *
 * @param {EntitySearchProps} root0 - Search props.
 * @param {string} root0.value - The current query.
 * @param {(value: string) => void} root0.onChange - Query change callback.
 * @param {string} root0.placeholder - Input placeholder and aria-label.
 * @param {string} root0.countLabel - Pre-formatted visible/total counter.
 * @param {string} [root0.className] - Optional placement classes.
 * @returns {React.ReactElement} The search input row.
 */
export function EntitySearch({
  value,
  onChange,
  placeholder,
  countLabel,
  className,
}: EntitySearchProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Input
        className="max-w-[300px]"
        placeholder={`${placeholder}…`}
        aria-label={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <span
        aria-live="polite"
        className="font-mono text-[11px] text-[var(--ink-3)]"
      >
        {countLabel}
      </span>
    </div>
  )
}
