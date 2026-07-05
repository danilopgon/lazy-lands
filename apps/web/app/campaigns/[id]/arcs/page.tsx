'use client'

import { EntityListScreen } from '@/components/campaigns/entity-list-screen'
import { ArcList } from '@/components/campaigns/arc-list'

/**
 * `/campaigns/:id/arcs` — read-only list of a campaign's arcs.
 *
 * @returns {React.ReactElement} The arcs page element.
 */
export default function ArcsPage() {
  return (
    <EntityListScreen
      kicker="Campaign · Open arcs"
      title="Open arcs"
      addLabel="+ New arc"
      subtitle={(campaign) => {
        const inPlay = campaign.arcs.filter(
          (arc) => arc.status === 'open'
        ).length
        return `${inPlay} threads still in play`
      }}
    >
      {(campaign) => <ArcList arcs={campaign.arcs} />}
    </EntityListScreen>
  )
}
