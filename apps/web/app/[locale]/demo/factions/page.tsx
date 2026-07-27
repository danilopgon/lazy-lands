'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { DemoEntityScreen } from '@/components/demo/demo-entity-screen'
import { EntitySearch } from '@/components/campaigns/entity-search'
import { FactionList } from '@/components/campaigns/faction-list'
import { FactionModal } from '@/components/campaigns/faction-modal'
import { ConfirmDeleteModal } from '@/components/campaigns/confirm-delete-modal'
import { ModalPresence } from '@/components/motion/modal-presence'
import { matchesQuery } from '@/lib/campaigns/text-match'
import { useDemoStore } from '@/lib/demo/store'

import type { FactionResponse } from '@/lib/campaigns/schemas'

/**
 * Case-insensitive match of a faction against a query across its text fields.
 *
 * @param {FactionResponse} faction - The faction to test.
 * @param {string} query - The lowercased query.
 * @returns {boolean} Whether any of the faction's text fields contain the query.
 */
function factionMatches(faction: FactionResponse, query: string): boolean {
  return matchesQuery(
    [faction.name, faction.description, faction.current_stance, faction.goals],
    query
  )
}

/**
 * `/demo/factions` — the faction list with local create/edit/delete against the
 * demo store, reusing the production faction components verbatim.
 *
 * @returns {React.ReactElement} The demo factions page element.
 */
export default function DemoFactionsPage() {
  const t = useTranslations('Campaigns')
  const te = useTranslations('Entities')
  const store = useDemoStore()
  const campaignId = store.campaign.id
  const [modal, setModal] = useState<'add' | FactionResponse | null>(null)
  const [deleting, setDeleting] = useState<FactionResponse | null>(null)
  const [query, setQuery] = useState('')

  return (
    <>
      <DemoEntityScreen
        kicker={t('factions.kicker')}
        title={t('factions.title')}
        addLabel={t('factions.add')}
        subtitle={(campaign) =>
          t('factions.subtitle', { count: campaign.factions.length })
        }
        onAdd={() => setModal('add')}
      >
        {(campaign) => {
          const q = query.trim().toLowerCase()
          const shown = q
            ? campaign.factions.filter((faction) => factionMatches(faction, q))
            : campaign.factions

          return (
            <>
              {campaign.factions.length > 0 ? (
                <EntitySearch
                  className="mb-4"
                  value={query}
                  onChange={setQuery}
                  placeholder={te('searchFactions')}
                  countLabel={te('searchCount', {
                    visible: shown.length,
                    total: campaign.factions.length,
                  })}
                />
              ) : null}

              {campaign.factions.length > 0 && shown.length === 0 ? (
                <p className="border-2 border-dotted border-[var(--dotted)] px-5 py-8 text-center text-sm text-[var(--ink-2)]">
                  {te('noSearchMatch')}
                </p>
              ) : (
                <FactionList
                  factions={shown}
                  onAdd={() => setModal('add')}
                  onEdit={(faction) => setModal(faction)}
                  onDelete={(faction) => setDeleting(faction)}
                />
              )}
            </>
          )
        }}
      </DemoEntityScreen>

      <ModalPresence open={modal !== null}>
        {modal !== null ? (
          <FactionModal
            key="entity"
            campaignId={campaignId}
            faction={modal === 'add' ? null : modal}
            onClose={() => setModal(null)}
            onSubmit={(draft) =>
              modal === 'add'
                ? store.createFaction(draft)
                : store.updateFaction(modal.id, draft)
            }
          />
        ) : null}
      </ModalPresence>

      <ModalPresence open={deleting !== null}>
        {deleting ? (
          <ConfirmDeleteModal
            key="delete"
            title={t('factions.deleteTitle')}
            deleteError={t('factions.deleteError')}
            itemName={deleting.name}
            onConfirm={async () => {
              await store.deleteFaction(deleting.id)
              setDeleting(null)
            }}
            onClose={() => setDeleting(null)}
          />
        ) : null}
      </ModalPresence>
    </>
  )
}
