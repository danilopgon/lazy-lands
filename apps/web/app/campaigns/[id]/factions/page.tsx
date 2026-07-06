'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'

import { EntityListScreen } from '@/components/campaigns/entity-list-screen'
import { FactionList } from '@/components/campaigns/faction-list'
import { FactionModal } from '@/components/campaigns/faction-modal'
import { ConfirmDeleteModal } from '@/components/campaigns/confirm-delete-modal'
import { deleteFaction } from '@/lib/campaigns/api'

import type { FactionResponse } from '@/lib/campaigns/schemas'

/**
 * `/campaigns/:id/factions` — a campaign's factions with create/edit/delete.
 *
 * @returns {React.ReactElement} The factions page element.
 */
export default function FactionsPage() {
  const params = useParams<{ id: string }>()
  const campaignId = params.id
  const queryClient = useQueryClient()
  const [modal, setModal] = useState<'add' | FactionResponse | null>(null)
  const [deleting, setDeleting] = useState<FactionResponse | null>(null)

  return (
    <>
      <EntityListScreen
        kicker="Campaign · Factions"
        title="Factions"
        addLabel="+ New faction"
        subtitle={(campaign) =>
          `${campaign.factions.length} powers reacting to the party`
        }
        onAdd={() => setModal('add')}
      >
        {(campaign) => (
          <FactionList
            factions={campaign.factions}
            onAdd={() => setModal('add')}
            onEdit={(faction) => setModal(faction)}
            onDelete={(faction) => setDeleting(faction)}
          />
        )}
      </EntityListScreen>

      {modal !== null ? (
        <FactionModal
          campaignId={campaignId}
          faction={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
        />
      ) : null}

      {deleting ? (
        <ConfirmDeleteModal
          entityLabel="faction"
          itemName={deleting.name}
          onConfirm={async () => {
            await deleteFaction(deleting.id)
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
