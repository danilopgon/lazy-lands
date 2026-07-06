import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { OriginBadge } from '@/components/ui/origin-badge'
import { contentSourceToBadgeOrigin } from '@/lib/campaigns/provenance'

import type { ArcResponse, ArcStatus } from '@/lib/campaigns/schemas'

type ArcListProps = {
  arcs: ArcResponse[]
  onAdd?: () => void
  onEdit?: (arc: ArcResponse) => void
  onDelete?: (arc: ArcResponse) => void
}

/**
 * Terminal arcs (resolved/discarded) are dimmed; active/dormant are in play.
 * @param {ArcStatus | null} status - The arc's lifecycle status.
 * @returns {boolean} True when the arc is resolved or discarded.
 */
function isTerminal(status: ArcStatus | null): boolean {
  return status === 'resolved' || status === 'discarded'
}

/**
 * Read-only list of a campaign's arcs. Renders the empty state when there are
 * none. Resolved and discarded arcs render dimmed. Per-row Edit/Delete and the
 * header "+ New arc" are wired to modals in Work Unit 3; the handoff's inline
 * Resolve/Discard/Reopen actions and generation checkbox are also Work Unit 3.
 *
 * @param {object} root0 - The arc list props.
 * @param {ArcResponse[]} root0.arcs - The arcs to render.
 * @param {() => void} [root0.onAdd] - Open the create modal.
 * @param {(arc: ArcResponse) => void} [root0.onEdit] - Open the edit modal for a row.
 * @param {(arc: ArcResponse) => void} [root0.onDelete] - Open the delete confirm for a row.
 * @returns {React.ReactElement} The arc list element.
 */
export function ArcList({ arcs, onAdd, onEdit, onDelete }: ArcListProps) {
  if (arcs.length === 0) {
    return (
      <EmptyState
        ornament="↝"
        title="No arcs here"
        description="Arcs are the threads your players are pulling on. Track them so none go quiet for too long."
        action={
          <Button variant="ink" onClick={onAdd}>
            + Add an arc
          </Button>
        }
      />
    )
  }

  return (
    <div className="border-2 border-[var(--border)] bg-[var(--paper)] px-5 shadow-[6px_6px_0_var(--shadow)]">
      {arcs.map((arc) => (
        <ArcRow key={arc.id} arc={arc} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  )
}

/**
 * A single arc row: title, status pill, priority flag, provenance, and the
 * Edit/Delete controls, followed by the description. Terminal arcs are dimmed.
 *
 * @param {object} root0 - The arc row props.
 * @param {ArcResponse} root0.arc - The arc to render.
 * @param {(arc: ArcResponse) => void} [root0.onEdit] - Open the edit modal.
 * @param {(arc: ArcResponse) => void} [root0.onDelete] - Open the delete confirm.
 * @returns {React.ReactElement} The arc row element.
 */
function ArcRow({
  arc,
  onEdit,
  onDelete,
}: {
  arc: ArcResponse
  onEdit?: (arc: ArcResponse) => void
  onDelete?: (arc: ArcResponse) => void
}) {
  const terminal = isTerminal(arc.status)

  return (
    <div
      className={`border-b border-dotted border-[var(--dotted)] py-5 last:border-b-0 ${
        terminal ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <span className="font-serif text-[18px] font-semibold text-[var(--ink)]">
            {arc.title}
          </span>
          {arc.status ? (
            <Badge variant={terminal ? 'muted' : 'accent'}>{arc.status}</Badge>
          ) : null}
          {arc.priority ? (
            <span
              className={`font-mono text-[10px] font-semibold uppercase tracking-[0.08em] ${
                arc.priority === 'high'
                  ? 'text-[var(--danger)]'
                  : 'text-[var(--ink-3)]'
              }`}
            >
              {arc.priority} priority
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {arc.content_source ? (
            <OriginBadge
              origin={contentSourceToBadgeOrigin(arc.content_source)}
            />
          ) : null}
          <button
            type="button"
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)] hover:underline"
            onClick={() => onEdit?.(arc)}
          >
            Edit
          </button>
          <button
            type="button"
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-3)] hover:underline"
            onClick={() => onDelete?.(arc)}
          >
            Delete
          </button>
        </div>
      </div>
      {arc.description ? (
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-2)]">
          {arc.description}
        </p>
      ) : null}
    </div>
  )
}
