import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { OriginBadge } from '@/components/ui/origin-badge'
import { contentSourceToBadgeOrigin } from '@/lib/campaigns/provenance'

import type { FactionResponse } from '@/lib/campaigns/schemas'

type FactionListProps = {
  factions: FactionResponse[]
}

/**
 * Read-only list of a campaign's factions. Renders the empty state when there
 * are none. Per-row Edit/Delete and the header "+ New faction" are wired to
 * modals in Work Unit 3 (entity-management); posture is edited through that
 * modal rather than the handoff's inline dropdown.
 *
 * @param {object} root0 - The faction list props.
 * @param {FactionResponse[]} root0.factions - The factions to render.
 * @returns {React.ReactElement} The faction list element.
 */
export function FactionList({ factions }: FactionListProps) {
  if (factions.length === 0) {
    return (
      <EmptyState
        ornament="⬡"
        title="No factions yet"
        description="Guilds, cults, courts: anything that wants something. Add them and track how they react."
        action={<Button variant="ink">+ Add a faction</Button>}
      />
    )
  }

  return (
    <div className="border-2 border-[var(--border)] bg-[var(--paper)] px-5 shadow-[6px_6px_0_var(--shadow)]">
      {factions.map((faction) => (
        <FactionRow key={faction.id} faction={faction} />
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
 * @returns {React.ReactElement} The faction row element.
 */
function FactionRow({ faction }: { faction: FactionResponse }) {
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
          {/* Wired to the edit/delete modals in Work Unit 3. */}
          <button
            type="button"
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)] hover:underline"
          >
            Edit
          </button>
          <button
            type="button"
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-3)] hover:underline"
          >
            Delete
          </button>
        </div>
      </div>
      {faction.current_stance ? (
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          <b className="font-semibold text-[var(--ink)]">Stance:</b>{' '}
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
          <b className="font-semibold text-[var(--ink)]">Objective:</b>{' '}
          {faction.goals}
        </p>
      ) : null}
    </div>
  )
}
