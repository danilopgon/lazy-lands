'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'

import { EntityListScreen } from '@/components/campaigns/entity-list-screen'
import { EntitySearch } from '@/components/campaigns/entity-search'
import { NpcList } from '@/components/campaigns/npc-list'
import { NpcModal } from '@/components/campaigns/npc-modal'
import { ConfirmDeleteModal } from '@/components/campaigns/confirm-delete-modal'
import { deleteNpc } from '@/lib/campaigns/api'
import { matchesQuery } from '@/lib/campaigns/text-match'

import type { NpcResponse } from '@/lib/campaigns/schemas'

/**
 * Case-insensitive match of an NPC against a query across its text fields.
 *
 * @param {NpcResponse} npc - The NPC to test.
 * @param {string} query - The lowercased query.
 * @returns {boolean} Whether any of the NPC's text fields contain the query.
 */
function npcMatches(npc: NpcResponse, query: string): boolean {
  return matchesQuery(
    [npc.name, npc.description, npc.current_state, npc.motivation],
    query
  )
}

/**
 * `/campaigns/:id/npcs` — a campaign's NPCs with create/edit/delete.
 *
 * @returns {React.ReactElement} The NPCs page element.
 */
export default function NpcsPage() {
  const params = useParams<{ id: string }>()
  const campaignId = params.id
  const t = useTranslations('Campaigns')
  const te = useTranslations('Entities')
  const queryClient = useQueryClient()
  // null = closed, 'add' = create, NpcResponse = edit that NPC.
  const [modal, setModal] = useState<'add' | NpcResponse | null>(null)
  const [deleting, setDeleting] = useState<NpcResponse | null>(null)
  const [query, setQuery] = useState('')

  return (
    <>
      <EntityListScreen
        kicker={t('npcs.kicker')}
        title={t('npcs.title')}
        addLabel={t('npcs.add')}
        subtitle={(campaign) =>
          t('npcs.subtitle', { count: campaign.npcs.length })
        }
        onAdd={() => setModal('add')}
      >
        {(campaign) => {
          const q = query.trim().toLowerCase()
          const shown = q
            ? campaign.npcs.filter((npc) => npcMatches(npc, q))
            : campaign.npcs

          return (
            <>
              {campaign.npcs.length > 0 ? (
                <EntitySearch
                  className="mb-4"
                  value={query}
                  onChange={setQuery}
                  placeholder={te('searchNpcs')}
                  countLabel={te('searchCount', {
                    visible: shown.length,
                    total: campaign.npcs.length,
                  })}
                />
              ) : null}

              {campaign.npcs.length > 0 && shown.length === 0 ? (
                <p className="border-2 border-dotted border-[var(--dotted)] px-5 py-8 text-center text-sm text-[var(--ink-2)]">
                  {te('noSearchMatch')}
                </p>
              ) : (
                <NpcList
                  npcs={shown}
                  onAdd={() => setModal('add')}
                  onEdit={(npc) => setModal(npc)}
                  onDelete={(npc) => setDeleting(npc)}
                />
              )}
            </>
          )
        }}
      </EntityListScreen>

      {modal !== null ? (
        <NpcModal
          campaignId={campaignId}
          npc={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
        />
      ) : null}

      {deleting ? (
        <ConfirmDeleteModal
          title={t('npcs.deleteTitle')}
          deleteError={t('npcs.deleteError')}
          itemName={deleting.name}
          onConfirm={async () => {
            await deleteNpc(deleting.id)
            queryClient.invalidateQueries({
              queryKey: ['campaign', campaignId],
            })
            setDeleting(null)
          }}
          onClose={() => setDeleting(null)}
        />
      ) : null}
    </>
  )
}
