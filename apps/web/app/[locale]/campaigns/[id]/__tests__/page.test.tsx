import { render, screen, waitFor } from '@/tests/intl'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetCampaignDetail, mockUpdateCampaign } = vi.hoisted(() => ({
  mockGetCampaignDetail: vi.fn(),
  mockUpdateCampaign: vi.fn(),
}))

vi.mock('@/lib/campaigns/api', () => ({
  getCampaignDetail: mockGetCampaignDetail,
  updateCampaign: mockUpdateCampaign,
  CampaignApiError: class CampaignApiError extends Error {},
  CampaignNotFoundError: class CampaignNotFoundError extends Error {},
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
function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <CampaignDetailPage />
    </QueryClientProvider>
  )
}

describe('CampaignDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
  })

  it('renders dimmed placeholders for sessions and memories sections', async () => {
    mockGetCampaignDetail.mockResolvedValue(buildCampaignDetail())
    renderPage()

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Shadows over Phandalin' })
      ).toBeInTheDocument()
    })

    const placeholders = screen.getAllByText(/coming in a later chapter/i)
    expect(placeholders).toHaveLength(2)
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

  it('keeps the textarea open with an inline error when save fails', async () => {
    const user = userEvent.setup()
    mockGetCampaignDetail.mockResolvedValue(buildCampaignDetail())
    const { CampaignApiError } = await import('@/lib/campaigns/api')
    mockUpdateCampaign.mockRejectedValue(new CampaignApiError('Save failed'))
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
      expect(screen.getByText(/save failed/i)).toBeInTheDocument()
    })
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
