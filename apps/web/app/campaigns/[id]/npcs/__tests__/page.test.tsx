import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetCampaignDetail } = vi.hoisted(() => ({
  mockGetCampaignDetail: vi.fn(),
}))

vi.mock('@/lib/campaigns/api', () => ({
  getCampaignDetail: mockGetCampaignDetail,
  CampaignApiError: class CampaignApiError extends Error {},
  CampaignNotFoundError: class CampaignNotFoundError extends Error {},
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'camp-1' }),
  useRouter: () => ({ push: vi.fn() }),
}))

import NpcsPage from '../page'
import type { CampaignDetailResponse } from '@/lib/campaigns/schemas'

/** Build a CampaignDetailResponse fixture with overridable NPCs. */
function buildDetail(
  overrides: Partial<CampaignDetailResponse> = {}
): CampaignDetailResponse {
  return {
    id: 'camp-1',
    title: 'Shadows over Phandalin',
    description: null,
    world_state: null,
    system: null,
    tone: null,
    updated_at: '2026-06-15T10:00:00Z',
    npcs: [],
    factions: [],
    arcs: [],
    ...overrides,
  }
}

/** Render the NPCs page inside a fresh QueryClientProvider. */
function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <NpcsPage />
    </QueryClientProvider>
  )
}

describe('NpcsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('renders the loading state while fetching', () => {
    mockGetCampaignDetail.mockReturnValue(new Promise(() => {}))
    renderPage()

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders an error state with a retry that refetches', async () => {
    mockGetCampaignDetail.mockRejectedValueOnce(new Error('boom'))
    renderPage()

    await waitFor(() => {
      expect(
        screen.getByText(/something went wrong while loading this campaign/i)
      ).toBeInTheDocument()
    })

    mockGetCampaignDetail.mockResolvedValueOnce(
      buildDetail({
        npcs: [
          {
            id: 'npc-1',
            name: 'Sildar Hallwinter',
            description: 'A retired soldier',
            current_state: 'Alive',
            motivation: 'Restore order',
            content_source: 'manual',
          },
        ],
      })
    )
    await userEvent.click(screen.getByRole('button', { name: /retry/i }))

    await waitFor(() => {
      expect(screen.getByText('Sildar Hallwinter')).toBeInTheDocument()
    })
  })

  it('renders the empty state with the add-first-NPC action', async () => {
    mockGetCampaignDetail.mockResolvedValue(buildDetail({ npcs: [] }))
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('No NPCs yet')).toBeInTheDocument()
    })
    expect(
      screen.getByRole('button', { name: /add your first npc/i })
    ).toBeInTheDocument()
  })

  it('renders name, current state, description, motivation, and provenance', async () => {
    mockGetCampaignDetail.mockResolvedValue(
      buildDetail({
        npcs: [
          {
            id: 'npc-1',
            name: 'Sildar Hallwinter',
            description: 'A retired soldier of the Lords Alliance',
            current_state: 'Recovering',
            motivation: 'Restore order to Phandalin',
            content_source: 'llm',
          },
        ],
      })
    )
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Sildar Hallwinter')).toBeInTheDocument()
    })
    expect(screen.getByText('Recovering')).toBeInTheDocument()
    expect(
      screen.getByText(/a retired soldier of the lords alliance/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/restore order to phandalin/i)).toBeInTheDocument()
    expect(screen.getByText(/scribe/i)).toBeInTheDocument()
  })

  it('does not render fabricated relation/faction/sessions columns', async () => {
    mockGetCampaignDetail.mockResolvedValue(
      buildDetail({
        npcs: [
          {
            id: 'npc-1',
            name: 'Sildar Hallwinter',
            description: 'desc',
            current_state: null,
            motivation: null,
            content_source: 'llm',
          },
        ],
      })
    )
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Sildar Hallwinter')).toBeInTheDocument()
    })
    expect(screen.queryByText(/relation to party/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^faction:/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/sessions:/i)).not.toBeInTheDocument()
  })
})
