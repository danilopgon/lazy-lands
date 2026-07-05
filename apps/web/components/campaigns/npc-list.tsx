import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { OriginBadge } from '@/components/ui/origin-badge'
import { contentSourceToBadgeOrigin } from '@/lib/campaigns/provenance'

import type { NpcResponse } from '@/lib/campaigns/schemas'

type NpcListProps = {
  npcs: NpcResponse[]
}

/**
 * Read-only list of a campaign's NPCs. Renders the empty state when there are
 * none. Per-row Edit/Delete and the header "+ New NPC" are wired to modals in
 * Work Unit 3 (entity-management).
 *
 * @param {object} root0 - The NPC list props.
 * @param {NpcResponse[]} root0.npcs - The NPCs to render.
 * @returns {React.ReactElement} The NPC list element.
 */
export function NpcList({ npcs }: NpcListProps) {
  if (npcs.length === 0) {
    return (
      <EmptyState
        ornament="◈"
        title="No NPCs yet"
        description="The Scribe extracts NPCs from your notes, or add them by hand as the party meets them."
        action={<Button variant="ink">+ Add your first NPC</Button>}
      />
    )
  }

  return (
    <div className="border-2 border-[var(--border)] bg-[var(--paper)] px-5 shadow-[6px_6px_0_var(--shadow)]">
      {npcs.map((npc) => (
        <NpcRow key={npc.id} npc={npc} />
      ))}
    </div>
  )
}

/**
 * A single NPC row: name, free-text current state, provenance, and the
 * Edit/Delete controls, followed by description and motivation.
 *
 * @param {object} root0 - The NPC row props.
 * @param {NpcResponse} root0.npc - The NPC to render.
 * @returns {React.ReactElement} The NPC row element.
 */
function NpcRow({ npc }: { npc: NpcResponse }) {
  return (
    <div className="border-b border-dotted border-[var(--dotted)] py-5 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 font-serif text-[18px] font-semibold text-[var(--ink)]">
          {npc.name}
        </span>
        <div className="flex shrink-0 items-center gap-3">
          {npc.content_source ? (
            <OriginBadge
              origin={contentSourceToBadgeOrigin(npc.content_source)}
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
      {npc.current_state ? (
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          <b className="font-semibold text-[var(--ink)]">Current state:</b>{' '}
          {npc.current_state}
        </p>
      ) : null}
      {npc.description ? (
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-2)]">
          {npc.description}
        </p>
      ) : null}
      {npc.motivation ? (
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          <b className="font-semibold text-[var(--ink)]">Motivation:</b>{' '}
          {npc.motivation}
        </p>
      ) : null}
    </div>
  )
}
