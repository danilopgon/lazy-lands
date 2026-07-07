'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'

import { EntityListScreen } from '@/components/campaigns/entity-list-screen'
import { ArcList } from '@/components/campaigns/arc-list'
import { ArcModal } from '@/components/campaigns/arc-modal'
import { ConfirmDeleteModal } from '@/components/campaigns/confirm-delete-modal'
import { deleteArc } from '@/lib/campaigns/api'

import type { ArcResponse } from '@/lib/campaigns/schemas'

/**
 * `/campaigns/:id/arcs` — a campaign's arcs with create/edit/delete.
 *
 * @returns {React.ReactElement} The arcs page element.
 */
export default function ArcsPage() {
  const params = useParams<{ id: string }>()
  const campaignId = params.id
  const t = useTranslations('Campaigns')
  const queryClient = useQueryClient()
  const [modal, setModal] = useState<'add' | ArcResponse | null>(null)
  const [deleting, setDeleting] = useState<ArcResponse | null>(null)

  return (
    <>
      <EntityListScreen
        kicker={t('arcs.kicker')}
        title={t('arcs.title')}
        addLabel={t('arcs.add')}
        subtitle={(campaign) => {
          const inPlay = campaign.arcs.filter(
            (arc) => arc.status === 'active' || arc.status === 'dormant'
          ).length
          return t('arcs.subtitle', { count: inPlay })
        }}
        onAdd={() => setModal('add')}
      >
        {(campaign) => (
          <ArcList
            arcs={campaign.arcs}
            onAdd={() => setModal('add')}
            onEdit={(arc) => setModal(arc)}
            onDelete={(arc) => setDeleting(arc)}
          />
        )}
      </EntityListScreen>

      {modal !== null ? (
        <ArcModal
          campaignId={campaignId}
          arc={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
        />
      ) : null}

      {deleting ? (
        <ConfirmDeleteModal
          title={t('arcs.deleteTitle')}
          deleteError={t('arcs.deleteError')}
          itemName={deleting.title}
          onConfirm={async () => {
            await deleteArc(deleting.id)
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
