'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'

import { EntityListScreen } from '@/components/campaigns/entity-list-screen'
import { NpcList } from '@/components/campaigns/npc-list'
import { NpcModal } from '@/components/campaigns/npc-modal'
import { ConfirmDeleteModal } from '@/components/campaigns/confirm-delete-modal'
import { deleteNpc } from '@/lib/campaigns/api'

import type { NpcResponse } from '@/lib/campaigns/schemas'

/**
 * `/campaigns/:id/npcs` — a campaign's NPCs with create/edit/delete.
 *
 * @returns {React.ReactElement} The NPCs page element.
 */
export default function NpcsPage() {
  const params = useParams<{ id: string }>()
  const campaignId = params.id
  const t = useTranslations('Campaigns')
  const queryClient = useQueryClient()
  // null = closed, 'add' = create, NpcResponse = edit that NPC.
  const [modal, setModal] = useState<'add' | NpcResponse | null>(null)
  const [deleting, setDeleting] = useState<NpcResponse | null>(null)

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
        {(campaign) => (
          <NpcList
            npcs={campaign.npcs}
            onAdd={() => setModal('add')}
            onEdit={(npc) => setModal(npc)}
            onDelete={(npc) => setDeleting(npc)}
          />
        )}
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
