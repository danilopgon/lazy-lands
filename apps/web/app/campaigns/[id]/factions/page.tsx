'use client'

import { EntityListScreen } from '@/components/campaigns/entity-list-screen'
import { FactionList } from '@/components/campaigns/faction-list'

/**
 * `/campaigns/:id/factions` — read-only list of a campaign's factions.
 *
 * @returns {React.ReactElement} The factions page element.
 */
export default function FactionsPage() {
  return (
    <EntityListScreen
      kicker="Campaign · Factions"
      title="Factions"
      addLabel="+ New faction"
      subtitle={(campaign) =>
        `${campaign.factions.length} powers reacting to the party`
      }
    >
      {(campaign) => <FactionList factions={campaign.factions} />}
    </EntityListScreen>
  )
}
