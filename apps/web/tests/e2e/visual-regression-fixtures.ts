import type { Page, Route } from '@playwright/test'

const apiOrigin = 'http://127.0.0.1:4010'
export const visualCampaignId = 'visual-campaign'
export const visualSessionId = 'visual-session'

const campaign = {
  id: visualCampaignId,
  title: 'Shadows over Phandalin',
  description: 'A frontier chronicle shaped by magic and consequence.',
  world_state:
    'Phandalin prepares for a dragon while the Black Spider gathers leverage in the margins.',
  system: 'D&D 5e',
  tone: 'Low-magic intrigue',
  updated_at: '2026-07-01T12:00:00Z',
  npcs: [
    {
      id: 'npc-sildar',
      name: 'Sildar Hallwinter',
      description: 'A weary ally of the Lords’ Alliance.',
      current_state: 'Recovering at Townmaster’s Hall',
      motivation: 'Keep Phandalin independent',
      content_source: 'manual',
    },
  ],
  factions: [
    {
      id: 'faction-alliance',
      name: "Lords' Alliance",
      description: 'A coalition watching the frontier.',
      current_stance: 'Cautious',
      goals: 'Protect the road to Neverwinter',
      content_source: 'manual',
    },
  ],
  arcs: [
    {
      id: 'arc-plans',
      title: 'Recover the anti-dragon plans',
      description: 'The weapon still needs a stable arcane core.',
      priority: 'high',
      status: 'active',
      content_source: 'manual',
    },
    {
      id: 'arc-herman',
      title: "Robert Herman's revenge",
      description: 'A public humiliation has not been forgotten.',
      priority: 'medium',
      status: 'dormant',
      content_source: 'manual',
    },
  ],
}

const memories = [
  {
    id: 'memory-herman',
    campaign_id: visualCampaignId,
    source_session_id: 'session-6',
    content: 'Herman was publicly humiliated and has not yet retaliated.',
    type: 'consequence',
    importance: 'high',
    status: 'active',
    created_at: '2026-06-21T12:00:00Z',
    updated_at: '2026-06-21T12:00:00Z',
  },
  {
    id: 'memory-halia',
    campaign_id: visualCampaignId,
    source_session_id: 'session-6',
    content: "Halia's favor is split across the party.",
    type: 'relationship',
    importance: 'medium',
    status: 'active',
    created_at: '2026-06-21T12:00:00Z',
    updated_at: '2026-06-21T12:00:00Z',
  },
  {
    id: 'memory-core',
    campaign_id: visualCampaignId,
    source_session_id: 'session-5',
    content: 'The anti-dragon weapon requires a stable arcane core.',
    type: 'arc_progress',
    importance: 'high',
    status: 'active',
    created_at: '2026-06-14T12:00:00Z',
    updated_at: '2026-06-14T12:00:00Z',
  },
  {
    id: 'memory-manticore',
    campaign_id: visualCampaignId,
    source_session_id: null,
    content: 'The spared manticore may return when the road is least guarded.',
    type: 'tension',
    importance: 'low',
    status: 'active',
    created_at: '2026-06-07T12:00:00Z',
    updated_at: '2026-06-07T12:00:00Z',
  },
]

const session = {
  id: visualSessionId,
  campaign_id: visualCampaignId,
  session_number: 7,
  summary: 'The party secured a partial map and unsettled the Black Spider.',
  consequences: 'The town prepares for reprisal.',
  generated_content: {
    title: 'A Ledger of Ash and Oaths',
    sections: [
      {
        id: 'synopsis',
        label: 'Synopsis',
        body: 'The party follows the map into a ruined exchange beneath Phandalin.',
        origin: 'scribe',
      },
      {
        id: 'goal',
        label: 'Goal',
        body: 'Secure the arcane core before Herman can turn the town against them.',
        origin: 'edited',
      },
      {
        id: 'opening',
        label: 'Opening scene',
        body: 'A courier arrives with a sealed account book and a blood-red warning.',
        origin: 'scribe',
      },
    ],
    continuity_links: [
      {
        memory_fact_id: 'memory-herman',
        relevance: 'Herman’s grievance drives the opening pressure.',
      },
      {
        memory_fact_id: 'memory-core',
        relevance: 'The core determines the session objective.',
      },
    ],
  },
  trace_json: null,
  created_at: '2026-07-01T12:00:00Z',
  updated_at: '2026-07-01T12:00:00Z',
}

/**
 * Fulfill an intercepted API request with a JSON body.
 *
 * @param {Route} route - Playwright route to fulfill.
 * @param {unknown} body - Stable fixture payload.
 * @returns {Promise<void>} A fulfilled route response.
 */
function json(route: Route, body: unknown) {
  return route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(body),
  })
}

/**
 * Create the fixed, client-side Memory Review draft used by snapshots.
 *
 * @returns {string} Serialized stable review draft.
 */
function reviewDraft() {
  return JSON.stringify({
    version: 1,
    campaign_id: visualCampaignId,
    session_id: visualSessionId,
    session_number: 7,
    memory_suggestions: [
      {
        content: 'The Black Spider has learned where the party hides the map.',
        type: 'tension',
        importance: 'high',
        reason: 'It turns the recovered map into an immediate liability.',
        related: ['Black Spider', 'Phandalin'],
      },
    ],
  })
}

/**
 * Install stable API responses and an isolated review draft for visual snapshots.
 *
 * @param {Page} page - Playwright page that receives the fixtures.
 * @returns {Promise<void>} Installed initialization and request handlers.
 */
export async function installVisualRegressionFixtures(page: Page) {
  await page.addInitScript(
    ({ storageKey, value }) => sessionStorage.setItem(storageKey, value),
    {
      storageKey: `lazy-lands:memory-review:v1:${visualCampaignId}:${visualSessionId}`,
      value: reviewDraft(),
    }
  )

  await page.route(`${apiOrigin}/**`, async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname

    if (
      request.method() === 'GET' &&
      path === `/campaigns/${visualCampaignId}`
    ) {
      await json(route, campaign)
      return
    }

    if (
      request.method() === 'GET' &&
      path === `/campaigns/${visualCampaignId}/sessions`
    ) {
      await json(route, [
        {
          id: 'session-6',
          session_number: 6,
          summary: 'The party found the map.',
          consequences: 'Herman watched from the crowd.',
          has_generated_content: true,
          status: 'registered',
          created_at: '2026-06-21T12:00:00Z',
        },
      ])
      return
    }

    if (
      request.method() === 'GET' &&
      path === `/campaigns/${visualCampaignId}/memory-facts`
    ) {
      await json(route, memories)
      return
    }

    if (request.method() === 'GET' && path === `/sessions/${visualSessionId}`) {
      await json(route, session)
      return
    }

    if (request.method() === 'POST' && path.includes('/memory-facts')) {
      await json(route, memories[0])
      return
    }

    if (request.method() === 'PATCH') {
      await json(route, path.startsWith('/sessions/') ? session : memories[0])
      return
    }

    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: '{}',
    })
  })
}
