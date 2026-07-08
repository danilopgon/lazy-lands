'use client'

import { cn } from '@/lib/utils'

export type FilterOption<T extends string> = {
  value: T
  label: string
}

type EntityFilterBarProps<T extends string> = {
  /** Accessible label describing what the bar filters. */
  label: string
  /** Selectable options, including the "all" reset. */
  options: FilterOption<T>[]
  /** The active option value. */
  active: T
  /** Called with the chosen option value. */
  onChange: (value: T) => void
  className?: string
}

/**
 * A row of hard-edged status pills for filtering an entity list. The active
 * pill fills with ink; the rest are outlined. Generic over the value union so
 * each list supplies its own option set (e.g. arc statuses).
 *
 * @param {EntityFilterBarProps<T>} root0 - Filter bar props.
 * @param {string} root0.label - Accessible label for the group.
 * @param {FilterOption<T>[]} root0.options - The filter options.
 * @param {T} root0.active - The active option value.
 * @param {(value: T) => void} root0.onChange - Selection callback.
 * @param {string} [root0.className] - Optional placement classes.
 * @returns {React.ReactElement} The filter bar element.
 */
export function EntityFilterBar<T extends string>({
  label,
  options,
  active,
  onChange,
  className,
}: EntityFilterBarProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('flex flex-wrap gap-2', className)}
    >
      {options.map((option) => {
        const isActive = option.value === active
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'border-2 border-[var(--border)] px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors',
              isActive
                ? 'bg-[var(--ink)] text-[var(--bg-contrast)]'
                : 'bg-[var(--paper)] text-[var(--ink-2)] hover:text-[var(--ink)]'
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
