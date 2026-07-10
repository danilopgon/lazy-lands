import { render, screen } from '@/tests/intl'
import { beforeEach, describe, expect, it } from 'vitest'

import { EntityNav } from '@/components/campaigns/entity-nav'

const CAMPAIGN_ID = 'camp-1'
const BASE = `/campaigns/${CAMPAIGN_ID}`

describe('EntityNav', () => {
  beforeEach(() => {
    window.history.pushState(null, '', BASE)
  })

  it('links each section to its campaign-scoped route', () => {
    render(<EntityNav campaignId={CAMPAIGN_ID} />)

    expect(screen.getByRole('link', { name: /overview/i })).toHaveAttribute(
      'href',
      BASE
    )
    expect(screen.getByRole('link', { name: /npcs/i })).toHaveAttribute(
      'href',
      `${BASE}/npcs`
    )
    expect(screen.getByRole('link', { name: /factions/i })).toHaveAttribute(
      'href',
      `${BASE}/factions`
    )
    expect(screen.getByRole('link', { name: /arcs/i })).toHaveAttribute(
      'href',
      `${BASE}/arcs`
    )
    expect(screen.getByRole('link', { name: /prepare/i })).toHaveAttribute(
      'href',
      `${BASE}/prepare`
    )
  })

  it('marks the Prepare tab active on the prepare route', () => {
    window.history.pushState(null, '', `${BASE}/prepare`)
    render(<EntityNav campaignId={CAMPAIGN_ID} />)

    expect(screen.getByRole('link', { name: /prepare/i })).toHaveAttribute(
      'aria-current',
      'page'
    )
  })

  it('marks Overview active on the campaign root only', () => {
    window.history.pushState(null, '', BASE)
    render(<EntityNav campaignId={CAMPAIGN_ID} />)

    expect(screen.getByRole('link', { name: /overview/i })).toHaveAttribute(
      'aria-current',
      'page'
    )
    expect(screen.getByRole('link', { name: /npcs/i })).not.toHaveAttribute(
      'aria-current'
    )
  })

  it('marks the NPCs tab active on an NPC sub-route', () => {
    window.history.pushState(null, '', `${BASE}/npcs`)
    render(<EntityNav campaignId={CAMPAIGN_ID} />)

    expect(screen.getByRole('link', { name: /npcs/i })).toHaveAttribute(
      'aria-current',
      'page'
    )
    // Overview must NOT stay active once inside a sub-route.
    expect(screen.getByRole('link', { name: /overview/i })).not.toHaveAttribute(
      'aria-current'
    )
  })
})
