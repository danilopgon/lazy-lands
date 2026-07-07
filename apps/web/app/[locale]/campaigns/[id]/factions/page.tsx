'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('Campaigns')
  const queryClient = useQueryClient()
  const [modal, setModal] = useState<'add' | FactionResponse | null>(null)
  const [deleting, setDeleting] = useState<FactionResponse | null>(null)

  return (
    <>
      <EntityListScreen
        kicker={t('factions.kicker')}
        title={t('factions.title')}
        addLabel={t('factions.add')}
        subtitle={(campaign) =>
          t('factions.subtitle', { count: campaign.factions.length })
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
          title={t('factions.deleteTitle')}
          deleteError={t('factions.deleteError')}
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
