'use client'

import { EntityListScreen } from '@/components/campaigns/entity-list-screen'
import { NpcList } from '@/components/campaigns/npc-list'

/**
 * `/campaigns/:id/npcs` — read-only list of a campaign's NPCs.
 *
 * @returns {React.ReactElement} The NPCs page element.
 */
export default function NpcsPage() {
  return (
    <EntityListScreen
      kicker="Campaign · NPCs"
      title="NPCs"
      addLabel="+ New NPC"
      subtitle={(campaign) =>
        `${campaign.npcs.length} characters tracked across the chronicle`
      }
    >
      {(campaign) => <NpcList npcs={campaign.npcs} />}
    </EntityListScreen>
  )
}
