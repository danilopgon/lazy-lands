import { render, screen, waitFor } from '@/tests/intl'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockGetCampaignDetail,
  mockUpdateCampaign,
  mockGetSessions,
  mockGetMemoryFacts,
} = vi.hoisted(() => ({
  mockGetCampaignDetail: vi.fn(),
  mockUpdateCampaign: vi.fn(),
  mockGetSessions: vi.fn(),
  mockGetMemoryFacts: vi.fn(),
}))

vi.mock('@/lib/campaigns/api', () => {
  // Mirror the real CampaignApiError: string input maps to backend.generic
  // (it never forwards a raw string as the messageKey), options pass through.
  // CampaignNotFoundError extends CampaignApiError so `instanceof` checks and
  // the inheritance chain mirror the production classes.
  class CampaignApiError extends Error {
    readonly messageKey: string

    constructor(
      error:
        | {
            messageKey: string
            code?: unknown
            source?: unknown
            retryable?: unknown
            status?: unknown
          }
        | string = 'backend.generic'
    ) {
      const messageKey =
        typeof error === 'string' ? 'backend.generic' : error.messageKey
      super(`Errors.${messageKey}`)
      this.messageKey = messageKey
    }
  }
  class CampaignNotFoundError extends CampaignApiError {}

  return {
    getCampaignDetail: mockGetCampaignDetail,
    updateCampaign: mockUpdateCampaign,
    CampaignApiError,
    CampaignNotFoundError,
  }
})

vi.mock('@/lib/sessions/api', () => ({
  getSessions: mockGetSessions,
  SessionApiError: class SessionApiError extends Error {},
  SessionCampaignNotFoundError: class SessionCampaignNotFoundError extends Error {},
}))

vi.mock('@/lib/memory/api', () => ({
  getMemoryFacts: mockGetMemoryFacts,
  MemoryApiError: class MemoryApiError extends Error {},
  MemoryCampaignNotFoundError: class MemoryCampaignNotFoundError extends Error {},
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'camp-1' }),
  useRouter: () => ({ push: vi.fn() }),
}))

import CampaignDetailPage from '../page'
import type { CampaignDetailResponse } from '@/lib/campaigns/schemas'

/** Build a CampaignDetailResponse fixture with sensible defaults. */
function buildCampaignDetail(
  overrides: Partial<CampaignDetailResponse> = {}
): CampaignDetailResponse {
  return {
    id: 'camp-1',
    title: 'Shadows over Phandalin',
    description: 'A mining town in peril',
    world_state:
      'The town of Phandalin sits at the edge of the Sword Coast, a frontier settlement built atop the ruins of a once-great trading hub.',
    system: 'D&D 5e',
    tone: 'Low-magic intrigue',
    updated_at: '2026-06-15T10:00:00Z',
    npcs: [
      {
        id: 'npc-1',
        name: 'Sildar Hallwinter',
        description: 'A retired soldier',
        current_state: 'Alive and well',
        motivation: 'Restore order',
        content_source: 'manual',
      },
    ],
    factions: [
      {
        id: 'fac-1',
        name: "The Lord's Alliance",
        description: 'A coalition of city-states',
        current_stance: 'Friendly',
        goals: 'Expand influence',
        content_source: 'manual',
      },
    ],
    arcs: [
      {
        id: 'arc-1',
        title: 'The Spider Pact',
        description: 'A mysterious deal in the shadows',
        priority: 'high',
        status: 'active',
        content_source: 'manual',
      },
      {
        id: 'arc-2',
        title: 'The Lost Mine',
        description: 'An ancient mine rediscovered',
        priority: 'medium',
        status: 'dormant',
        content_source: 'llm',
      },
      {
        id: 'arc-3',
        title: 'Redbrand Menace',
        description: 'Bandits terrorizing the town',
        priority: 'high',
        status: 'active',
        content_source: 'manual',
      },
    ],
    ...overrides,
  }
}

/** Render the detail page wrapped in a fresh QueryClientProvider. */
function renderPage(locale: 'en' | 'es' = 'en') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <CampaignDetailPage />
    </QueryClientProvider>,
    { locale }
  )
}

describe('CampaignDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSessions.mockResolvedValue([])
    mockGetMemoryFacts.mockResolvedValue([])
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('renders LoadingScribe while the campaign is being fetched', () => {
    mockGetCampaignDetail.mockReturnValue(new Promise(() => {}))
    renderPage()

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText(/the scribe is writing/i)).toBeInTheDocument()
  })

  it('renders an error notice with retry action when the fetch fails', async () => {
    mockGetCampaignDetail.mockRejectedValue(new Error('Network error'))
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('renders a not-found state when the campaign does not exist', async () => {
    const { CampaignNotFoundError } = await import('@/lib/campaigns/api')
    mockGetCampaignDetail.mockRejectedValue(
      new CampaignNotFoundError('Campaign camp-1 not found')
    )
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/campaign not found/i)).toBeInTheDocument()
    })
  })

  it('renders the full detail view on success', async () => {
    mockGetCampaignDetail.mockResolvedValue(buildCampaignDetail())
    renderPage()

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Shadows over Phandalin' })
      ).toBeInTheDocument()
    })

    expect(
      screen.getByText(/Campaign · D&D 5e · Low-magic intrigue/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/the town of phandalin/i)).toBeInTheDocument()
    expect(screen.getByText('NPCs')).toBeInTheDocument()
    expect(screen.getByText('Factions')).toBeInTheDocument()
    expect(screen.getByText('Arcs')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Log session' })).toHaveAttribute(
      'href',
      '/campaigns/camp-1/sessions/new'
    )
    expect(
      screen.getByRole('link', { name: 'Prepare next session' })
    ).toHaveAttribute('href', '/campaigns/camp-1/prepare')
  })

  it('renders live active memories and memory navigation instead of a placeholder', async () => {
    mockGetCampaignDetail.mockResolvedValue(buildCampaignDetail())
    mockGetMemoryFacts.mockResolvedValueOnce([
      {
        id: 'memory-1',
        campaign_id: 'camp-1',
        source_session_id: 'sess-1',
        content: 'The guild remembers the arson.',
        type: 'consequence',
        importance: 'medium',
        status: 'active',
        created_at: '2026-07-09T00:00:00Z',
        updated_at: '2026-07-09T00:00:00Z',
      },
    ])
    renderPage()

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Shadows over Phandalin' })
      ).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(
        screen.getByText(/the guild remembers the arson/i)
      ).toBeInTheDocument()
    })
    expect(screen.getByText(/accepted · linked session/i)).toBeInTheDocument()
    expect(screen.queryByText(/sess-1/i)).not.toBeInTheDocument()
    expect(
      screen.queryByText(/coming in a later chapter/i)
    ).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /memory/i })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          href: expect.stringContaining('/campaigns/camp-1/memory/review'),
        }),
      ])
    )
  })

  it.each([
    [
      'en',
      [
        'Consequence',
        'Relationship',
        'Secret',
        'Promise',
        'Tension',
        'Revelation',
        'Item',
        'Arc progress',
      ],
    ],
    [
      'es',
      [
        'Consecuencia',
        'Relación',
        'Secreto',
        'Promesa',
        'Tensión',
        'Revelación',
        'Objeto',
        'Avance de arco',
      ],
    ],
  ] as const)(
    'localizes canonical active-memory types in %s',
    async (locale, labels) => {
      mockGetCampaignDetail.mockResolvedValue(buildCampaignDetail())
      mockGetMemoryFacts.mockResolvedValue(
        [
          'consequence',
          'relationship',
          'secret',
          'promise',
          'tension',
          'revelation',
          'item',
          'arc_progress',
        ].map((type, index) => ({
          id: `memory-${type}`,
          campaign_id: 'camp-1',
          source_session_id: null,
          content: `Memory ${index + 1}`,
          type,
          importance: 'medium' as const,
          status: 'active' as const,
          created_at: '2026-07-09T00:00:00Z',
          updated_at: '2026-07-09T00:00:00Z',
        }))
      )

      renderPage(locale)

      await waitFor(() => {
        expect(screen.getByText('Memory 1')).toBeInTheDocument()
      })

      for (const label of labels) {
        expect(screen.getByText(label)).toBeInTheDocument()
      }
    }
  )

  it('renders active memories empty and retry states', async () => {
    mockGetCampaignDetail.mockResolvedValue(buildCampaignDetail())
    mockGetMemoryFacts.mockRejectedValue(new Error('network'))

    renderPage()

    await waitFor(() => {
      expect(
        screen.getByText(/could not load active memories/i)
      ).toBeInTheDocument()
    })

    mockGetMemoryFacts.mockResolvedValue([])
  })

  it('renders an empty state with a "Log session" CTA when there are no sessions', async () => {
    mockGetCampaignDetail.mockResolvedValue(buildCampaignDetail())
    mockGetSessions.mockResolvedValue([])
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/no sessions logged yet/i)).toBeInTheDocument()
    })

    const logSessionLinks = screen.getAllByRole('link', {
      name: /log session/i,
    })
    expect(logSessionLinks.length).toBeGreaterThan(0)
    expect(logSessionLinks[0]).toHaveAttribute(
      'href',
      '/campaigns/camp-1/sessions/new'
    )
  })

  it('renders recent sessions in chronological order, replacing the placeholder', async () => {
    mockGetCampaignDetail.mockResolvedValue(buildCampaignDetail())
    // Deliberately unsorted (2 before 1) so the assertion proves the panel
    // renders chronologically regardless of the incoming array order.
    mockGetSessions.mockResolvedValue([
      {
        id: 'sess-2',
        session_number: 2,
        summary: 'The warehouse burned down.',
        consequences: 'The guild lost its cache.',
        created_at: '2026-06-08T10:00:00Z',
      },
      {
        id: 'sess-1',
        session_number: 1,
        summary: 'The party arrived in town.',
        consequences: null,
        created_at: '2026-06-01T10:00:00Z',
      },
    ])
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/warehouse burned down/i)).toBeInTheDocument()
    })

    const earlier = screen.getByText(/party arrived in town/i)
    const later = screen.getByText(/warehouse burned down/i)
    // Session 1 (chronologically first) must render before session 2.
    expect(
      earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(
      screen.queryByText(/no sessions logged yet/i)
    ).not.toBeInTheDocument()
  })

  it('does not link logged sessions without generated content to the generated draft route', async () => {
    mockGetCampaignDetail.mockResolvedValue(buildCampaignDetail())
    mockGetSessions.mockResolvedValue([
      {
        id: 'logged-session',
        session_number: 1,
        summary: 'The party arrived in town.',
        consequences: null,
        generated_content: null,
        created_at: '2026-06-01T10:00:00Z',
      },
      {
        id: 'draft-session',
        session_number: 2,
        summary: 'The Scribe draft summary.',
        consequences: null,
        generated_content: {
          sections: [
            {
              id: 'synopsis',
              label: 'Synopsis',
              body: 'Draft body.',
              origin: 'scribe',
            },
          ],
        },
        created_at: '2026-06-08T10:00:00Z',
      },
    ])
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/party arrived in town/i)).toBeInTheDocument()
    })

    expect(
      screen.queryByRole('link', { name: /party arrived in town/i })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /the scribe draft summary/i })
    ).toHaveAttribute('href', '/campaigns/camp-1/sessions/draft-session')
  })

  it('toggles world-state into edit mode with autofocus on "Edit" click', async () => {
    const user = userEvent.setup()
    mockGetCampaignDetail.mockResolvedValue(buildCampaignDetail())
    renderPage()

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Shadows over Phandalin' })
      ).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /^edit$/i }))

    const textarea = screen.getByRole('textbox')
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveFocus()
    expect(
      screen.getByRole('button', { name: /save changes/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('saves world-state changes via updateCampaign and returns to display mode', async () => {
    const user = userEvent.setup()
    mockGetCampaignDetail.mockResolvedValue(buildCampaignDetail())
    mockUpdateCampaign.mockResolvedValue({
      id: 'camp-1',
      title: 'Shadows over Phandalin',
      description: null,
      world_state: 'Updated world state text',
      system: null,
      tone: null,
      updated_at: '2026-06-15T10:00:00Z',
    })
    renderPage()

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Shadows over Phandalin' })
      ).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /^edit$/i }))

    const textarea = screen.getByRole('textbox')
    await user.clear(textarea)
    await user.type(textarea, 'Updated world state text')

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })

    expect(mockUpdateCampaign).toHaveBeenCalledWith('camp-1', {
      world_state: 'Updated world state text',
    })
    expect(screen.getByText(/updated world state text/i)).toBeInTheDocument()
  })

  it('keeps the textarea open with a localized inline error when save fails', async () => {
    const user = userEvent.setup()
    mockGetCampaignDetail.mockResolvedValue(buildCampaignDetail())
    const { CampaignApiError } = await import('@/lib/campaigns/api')
    mockUpdateCampaign.mockRejectedValue(
      new CampaignApiError({
        code: 'validation',
        source: 'backend',
        retryable: false,
        messageKey: 'validation',
      })
    )
    renderPage()

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Shadows over Phandalin' })
      ).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /^edit$/i }))
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'Draft that fails to save')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/some details need attention/i)
      ).toBeInTheDocument()
    })
    expect(screen.queryByText('Errors.validation')).not.toBeInTheDocument()
    // Draft is preserved in the still-open textarea.
    expect(screen.getByRole('textbox')).toHaveValue('Draft that fails to save')
  })

  it('discards draft and returns to display mode on "Cancel"', async () => {
    const user = userEvent.setup()
    mockGetCampaignDetail.mockResolvedValue(buildCampaignDetail())
    renderPage()

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Shadows over Phandalin' })
      ).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /^edit$/i }))

    const textarea = screen.getByRole('textbox')
    await user.clear(textarea)
    await user.type(textarea, 'This should be discarded')

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    await waitFor(() => {
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })

    expect(
      screen.queryByText(/this should be discarded/i)
    ).not.toBeInTheDocument()
    expect(screen.getByText(/the town of phandalin/i)).toBeInTheDocument()
  })

  it('renders recent session entries as clickable links so generated drafts stay resumable', async () => {
    mockGetCampaignDetail.mockResolvedValue(buildCampaignDetail())
    mockGetSessions.mockResolvedValue([
      {
        id: 'sess-draft',
        session_number: 8,
        summary: null,
        consequences: null,
        generated_content: {
          sections: [
            {
              id: 'synopsis',
              label: 'Synopsis',
              body: 'Draft body.',
              origin: 'scribe',
            },
          ],
        },
        created_at: '2026-07-10T10:00:00Z',
      },
      {
        id: 'sess-logged',
        session_number: 7,
        summary: 'The warehouse burned down.',
        consequences: 'The guild lost its cache.',
        created_at: '2026-06-08T10:00:00Z',
      },
    ])
    renderPage()

    await waitFor(() =>
      expect(screen.getByText(/warehouse burned down/i)).toBeInTheDocument()
    )

    expect(screen.getByText('Session 8')).toBeInTheDocument()
    const draftLink = screen.getByRole('link', { name: /resume draft/i })
    expect(draftLink).toHaveAttribute(
      'href',
      '/campaigns/camp-1/sessions/sess-draft'
    )
    // The most recent session stays reachable from the session list entry too.
    expect(screen.getByRole('link', { name: /^Session 8$/i })).toHaveAttribute(
      'href',
      '/campaigns/camp-1/sessions/sess-draft'
    )
    expect(
      screen.queryByRole('link', { name: /^Session 7$/i })
    ).not.toBeInTheDocument()
  })

  it('omits the Resume draft affordance when no draft-like (unsummarized) session exists', async () => {
    mockGetCampaignDetail.mockResolvedValue(buildCampaignDetail())
    mockGetSessions.mockResolvedValue([
      {
        id: 'sess-logged',
        session_number: 7,
        summary: 'The warehouse burned down.',
        consequences: null,
        created_at: '2026-06-08T10:00:00Z',
      },
    ])
    renderPage()

    await waitFor(() =>
      expect(screen.getByText(/warehouse burned down/i)).toBeInTheDocument()
    )

    expect(screen.queryByRole('link', { name: /resume draft/i })).toBeNull()
  })

  it('renders the header action buttons with responsive stacking and minimum touch targets', async () => {
    mockGetCampaignDetail.mockResolvedValue(buildCampaignDetail())
    renderPage()

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Shadows over Phandalin' })
      ).toBeInTheDocument()
    })

    const logSession = screen.getByRole('link', { name: 'Log session' })
    const prepareNext = screen.getByRole('link', {
      name: 'Prepare next session',
    })
    expect(logSession).toBeInTheDocument()
    expect(prepareNext).toBeInTheDocument()

    // Both actions keep the 44px minimum touch target height.
    expect(logSession.className).toMatch(/h-11/)
    expect(prepareNext.className).toMatch(/h-11/)
    // The action container stacks to full-width on mobile and returns to a row
    // from small screens up so the buttons are never crushed narrow.
    const header = logSession.parentElement
    expect(header?.className).toMatch(/flex-col/)
    expect(header?.className).toMatch(/sm:flex-row/)
  })

  it('filters arcs to active/dormant status and shows max 3 with "All arcs" link', async () => {
    mockGetCampaignDetail.mockResolvedValue(
      buildCampaignDetail({
        arcs: [
          {
            id: 'arc-1',
            title: 'First Active Arc',
            description: 'desc',
            priority: 'high',
            status: 'active',
            content_source: 'manual',
          },
          {
            id: 'arc-2',
            title: 'A Dormant Arc',
            description: 'desc',
            priority: 'medium',
            status: 'dormant',
            content_source: 'manual',
          },
          {
            id: 'arc-3',
            title: 'Third Active Arc',
            description: 'desc',
            priority: 'low',
            status: 'active',
            content_source: 'manual',
          },
          {
            id: 'arc-4',
            title: 'Fourth Active Arc',
            description: 'desc',
            priority: 'low',
            status: 'active',
            content_source: 'manual',
          },
          {
            id: 'arc-5',
            title: 'Resolved Arc',
            description: 'desc',
            priority: 'low',
            status: 'resolved',
            content_source: 'manual',
          },
          {
            id: 'arc-6',
            title: 'Discarded Arc',
            description: 'desc',
            priority: 'low',
            status: 'discarded',
            content_source: 'manual',
          },
        ],
      })
    )
    renderPage()

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Shadows over Phandalin' })
      ).toBeInTheDocument()
    })

    // active/dormant arcs need attention, capped at 3; terminal arcs excluded.
    expect(screen.getByText('First Active Arc')).toBeInTheDocument()
    expect(screen.getByText('A Dormant Arc')).toBeInTheDocument()
    expect(screen.getByText('Third Active Arc')).toBeInTheDocument()
    expect(screen.queryByText('Fourth Active Arc')).not.toBeInTheDocument()
    expect(screen.queryByText('Resolved Arc')).not.toBeInTheDocument()
    expect(screen.queryByText('Discarded Arc')).not.toBeInTheDocument()

    const allArcsLink = screen.getByRole('link', { name: /all arcs/i })
    expect(allArcsLink).toHaveAttribute('href', '/campaigns/camp-1/arcs')
  })
})
