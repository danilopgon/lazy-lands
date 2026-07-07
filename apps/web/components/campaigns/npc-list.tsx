'use client'

import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { OriginBadge } from '@/components/ui/origin-badge'
import { contentSourceToBadgeOrigin } from '@/lib/campaigns/provenance'

import type { NpcResponse } from '@/lib/campaigns/schemas'

type NpcListProps = {
  npcs: NpcResponse[]
  onAdd?: () => void
  onEdit?: (npc: NpcResponse) => void
  onDelete?: (npc: NpcResponse) => void
}

/**
 * List of a campaign's NPCs. Renders the empty state when there are none.
 * The header "+ New NPC", per-row Edit, and per-row Delete open the create/
 * edit modal and delete confirm via the supplied callbacks.
 *
 * @param {object} root0 - The NPC list props.
 * @param {NpcResponse[]} root0.npcs - The NPCs to render.
 * @param {() => void} [root0.onAdd] - Open the create modal.
 * @param {(npc: NpcResponse) => void} [root0.onEdit] - Open the edit modal for a row.
 * @param {(npc: NpcResponse) => void} [root0.onDelete] - Open the delete confirm for a row.
 * @returns {React.ReactElement} The NPC list element.
 */
export function NpcList({ npcs, onAdd, onEdit, onDelete }: NpcListProps) {
  const t = useTranslations('Campaigns')
  if (npcs.length === 0) {
    return (
      <EmptyState
        ornament="◈"
        title={t('npcs.emptyTitle')}
        description={t('npcs.emptyDescription')}
        action={
          <Button variant="ink" onClick={onAdd}>
            {t('npcs.emptyAction')}
          </Button>
        }
      />
    )
  }

  return (
    <div className="border-2 border-[var(--border)] bg-[var(--paper)] px-5 shadow-[6px_6px_0_var(--shadow)]">
      {npcs.map((npc) => (
        <NpcRow key={npc.id} npc={npc} onEdit={onEdit} onDelete={onDelete} />
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
 * @param {(npc: NpcResponse) => void} [root0.onEdit] - Open the edit modal.
 * @param {(npc: NpcResponse) => void} [root0.onDelete] - Open the delete confirm.
 * @returns {React.ReactElement} The NPC row element.
 */
function NpcRow({
  npc,
  onEdit,
  onDelete,
}: {
  npc: NpcResponse
  onEdit?: (npc: NpcResponse) => void
  onDelete?: (npc: NpcResponse) => void
}) {
  const t = useTranslations('Entities')
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
          <button
            type="button"
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)] hover:underline"
            onClick={() => onEdit?.(npc)}
          >
            {t('edit')}
          </button>
          <button
            type="button"
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-3)] hover:underline"
            onClick={() => onDelete?.(npc)}
          >
            {t('delete')}
          </button>
        </div>
      </div>
      {npc.current_state ? (
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          <b className="font-semibold text-[var(--ink)]">
            {t('rowLabel.currentState')}
          </b>{' '}
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
          <b className="font-semibold text-[var(--ink)]">
            {t('rowLabel.motivation')}
          </b>{' '}
          {npc.motivation}
        </p>
      ) : null}
    </div>
  )
}
