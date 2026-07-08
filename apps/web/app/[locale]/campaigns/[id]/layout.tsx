import { EntityNav } from '@/components/campaigns/entity-nav'

/**
 * Layout for a single campaign — renders the contextual section nav (Overview,
 * NPCs, Factions, Arcs) above the campaign's pages, below the shared AppHeader
 * from the campaigns layout.
 *
 * @param {object} root0 - Layout props.
 * @param {React.ReactNode} root0.children - The campaign page content.
 * @param {Promise<{id: string}>} root0.params - Route params carrying the campaign id.
 * @returns {Promise<React.ReactElement>} The campaign nav wrapping the page.
 */
export default async function CampaignLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <>
      <EntityNav campaignId={id} />
      {children}
    </>
  )
}
