import { cn } from '@/lib/utils'

type StatLedgerItem = {
  value: string
  label: string
}

type StatLedgerProps = {
  items: StatLedgerItem[]
  className?: string
}

/**
 * Horizontal stat grid — value/label pairs in a bordered, shadowed ledger layout.
 *
 * @param {object} root0 - The stat ledger props.
 * @param {Array<{value: string, label: string}>} root0.items - Array of stat items with value and label.
 * @param {string} [root0.className] - Optional additional CSS classes to merge.
 * @returns {React.ReactElement} The stat ledger element.
 */
export function StatLedger({ items, className }: StatLedgerProps) {
  return (
    <dl
      className={cn(
        'grid border-2 border-[var(--border)] bg-[var(--paper)] shadow-[6px_6px_0_var(--shadow)] llg:grid-flow-col llg:auto-cols-fr',
        className
      )}
    >
      {items.map((item) => (
        <div
          key={`${item.value}-${item.label}`}
          className="border-b-2 border-[var(--border)] p-4 last:border-b-0 llg:border-r-2 llg:border-b-0 llg:last:border-r-0"
        >
          <dt className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--mute)]">
            {item.label}
          </dt>
          <dd className="mt-1 font-serif text-3xl font-semibold leading-none tracking-[-0.02em] text-[var(--ink)]">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
