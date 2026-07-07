'use client'

import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { OriginBadge } from '@/components/ui/origin-badge'
import { contentSourceToBadgeOrigin } from '@/lib/campaigns/provenance'

import type { FactionResponse } from '@/lib/campaigns/schemas'

type FactionListProps = {
  factions: FactionResponse[]
  onAdd?: () => void
  onEdit?: (faction: FactionResponse) => void
  onDelete?: (faction: FactionResponse) => void
}

/**
 * List of a campaign's factions. Renders the empty state when there are none.
 * The header "+ New faction", per-row Edit, and per-row Delete open the modals
 * via callbacks; posture is edited through the edit modal rather than the
 * handoff's inline dropdown (design deviation, flagged in 2.5.8).
 *
 * @param {object} root0 - The faction list props.
 * @param {FactionResponse[]} root0.factions - The factions to render.
 * @param {() => void} [root0.onAdd] - Open the create modal.
 * @param {(faction: FactionResponse) => void} [root0.onEdit] - Open the edit modal.
 * @param {(faction: FactionResponse) => void} [root0.onDelete] - Open the delete confirm.
 * @returns {React.ReactElement} The faction list element.
 */
export function FactionList({
  factions,
  onAdd,
  onEdit,
  onDelete,
}: FactionListProps) {
  const t = useTranslations('Campaigns')
  if (factions.length === 0) {
    return (
      <EmptyState
        ornament="⬡"
        title={t('factions.emptyTitle')}
        description={t('factions.emptyDescription')}
        action={
          <Button variant="ink" onClick={onAdd}>
            {t('factions.emptyAction')}
          </Button>
        }
      />
    )
  }

  return (
    <div className="border-2 border-[var(--border)] bg-[var(--paper)] px-5 shadow-[6px_6px_0_var(--shadow)]">
      {factions.map((faction) => (
        <FactionRow
          key={faction.id}
          faction={faction}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

/**
 * A single faction row: name, current stance, provenance, and the Edit/Delete
 * controls, followed by description and objective.
 *
 * @param {object} root0 - The faction row props.
 * @param {FactionResponse} root0.faction - The faction to render.
 * @param {(faction: FactionResponse) => void} [root0.onEdit] - Open the edit modal.
 * @param {(faction: FactionResponse) => void} [root0.onDelete] - Open the delete confirm.
 * @returns {React.ReactElement} The faction row element.
 */
function FactionRow({
  faction,
  onEdit,
  onDelete,
}: {
  faction: FactionResponse
  onEdit?: (faction: FactionResponse) => void
  onDelete?: (faction: FactionResponse) => void
}) {
  const t = useTranslations('Entities')
  return (
    <div className="border-b border-dotted border-[var(--dotted)] py-5 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 font-serif text-[18px] font-semibold text-[var(--ink)]">
          {faction.name}
        </span>
        <div className="flex shrink-0 items-center gap-3">
          {faction.content_source ? (
            <OriginBadge
              origin={contentSourceToBadgeOrigin(faction.content_source)}
            />
          ) : null}
          <button
            type="button"
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)] hover:underline"
            onClick={() => onEdit?.(faction)}
          >
            {t('edit')}
          </button>
          <button
            type="button"
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-3)] hover:underline"
            onClick={() => onDelete?.(faction)}
          >
            {t('delete')}
          </button>
        </div>
      </div>
      {faction.current_stance ? (
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          <b className="font-semibold text-[var(--ink)]">
            {t('rowLabel.stance')}
          </b>{' '}
          {faction.current_stance}
        </p>
      ) : null}
      {faction.description ? (
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-2)]">
          {faction.description}
        </p>
      ) : null}
      {faction.goals ? (
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          <b className="font-semibold text-[var(--ink)]">
            {t('rowLabel.objective')}
          </b>{' '}
          {faction.goals}
        </p>
      ) : null}
    </div>
  )
}
