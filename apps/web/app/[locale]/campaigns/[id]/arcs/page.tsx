'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'

import { EntityListScreen } from '@/components/campaigns/entity-list-screen'
import { EntityFilterBar } from '@/components/campaigns/entity-filter-bar'
import { ArcList } from '@/components/campaigns/arc-list'
import { ArcModal } from '@/components/campaigns/arc-modal'
import { ConfirmDeleteModal } from '@/components/campaigns/confirm-delete-modal'
import { deleteArc } from '@/lib/campaigns/api'

import type { ArcResponse, ArcStatus } from '@/lib/campaigns/schemas'

/** Arc statuses offered by the filter bar, in lifecycle order. */
const ARC_STATUSES: ArcStatus[] = ['active', 'dormant', 'resolved', 'discarded']
type ArcFilter = ArcStatus | 'all'

/**
 * `/campaigns/:id/arcs` — a campaign's arcs with create/edit/delete.
 *
 * @returns {React.ReactElement} The arcs page element.
 */
export default function ArcsPage() {
  const params = useParams<{ id: string }>()
  const campaignId = params.id
  const t = useTranslations('Campaigns')
  const te = useTranslations('Entities')
  const queryClient = useQueryClient()
  const [modal, setModal] = useState<'add' | ArcResponse | null>(null)
  const [deleting, setDeleting] = useState<ArcResponse | null>(null)
  const [filter, setFilter] = useState<ArcFilter>('all')

  const filterOptions = [
    { value: 'all' as const, label: te('filterAll') },
    ...ARC_STATUSES.map((status) => ({
      value: status,
      label: te(`status.${status}`),
    })),
  ]

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
        {(campaign) => {
          const shown =
            filter === 'all'
              ? campaign.arcs
              : campaign.arcs.filter((arc) => arc.status === filter)

          return (
            <>
              {campaign.arcs.length > 0 ? (
                <EntityFilterBar<ArcFilter>
                  className="mb-4"
                  label={te('filterByStatus')}
                  options={filterOptions}
                  active={filter}
                  onChange={setFilter}
                />
              ) : null}

              {campaign.arcs.length > 0 && shown.length === 0 ? (
                <p className="border-2 border-dotted border-[var(--dotted)] px-5 py-8 text-center text-sm text-[var(--ink-2)]">
                  {t('arcs.noMatch')}
                </p>
              ) : (
                <ArcList
                  arcs={shown}
                  onAdd={() => setModal('add')}
                  onEdit={(arc) => setModal(arc)}
                  onDelete={(arc) => setDeleting(arc)}
                />
              )}
            </>
          )
        }}
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
