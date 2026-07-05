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

import FactionsPage from '../page'
import type { CampaignDetailResponse } from '@/lib/campaigns/schemas'

/** Build a CampaignDetailResponse fixture with overridable factions. */
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

/** Render the factions page inside a fresh QueryClientProvider. */
function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <FactionsPage />
    </QueryClientProvider>
  )
}

describe('FactionsPage', () => {
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
        factions: [
          {
            id: 'fac-1',
            name: "The Lord's Alliance",
            description: 'A coalition',
            current_stance: 'Friendly',
            goals: 'Expand influence',
            content_source: 'manual',
          },
        ],
      })
    )
    await userEvent.click(screen.getByRole('button', { name: /retry/i }))

    await waitFor(() => {
      expect(screen.getByText("The Lord's Alliance")).toBeInTheDocument()
    })
  })

  it('renders the empty state with the add-faction action', async () => {
    mockGetCampaignDetail.mockResolvedValue(buildDetail({ factions: [] }))
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('No factions yet')).toBeInTheDocument()
    })
    expect(
      screen.getByRole('button', { name: /add a faction/i })
    ).toBeInTheDocument()
  })

  it('renders name, posture, description, and objective', async () => {
    mockGetCampaignDetail.mockResolvedValue(
      buildDetail({
        factions: [
          {
            id: 'fac-1',
            name: "The Lord's Alliance",
            description: 'A coalition of city-states',
            current_stance: 'Friendly',
            goals: 'Expand its influence across the coast',
            content_source: 'llm',
          },
        ],
      })
    )
    renderPage()

    await waitFor(() => {
      expect(screen.getByText("The Lord's Alliance")).toBeInTheDocument()
    })
    expect(screen.getByText('Friendly')).toBeInTheDocument()
    expect(screen.getByText(/a coalition of city-states/i)).toBeInTheDocument()
    expect(
      screen.getByText(/expand its influence across the coast/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/scribe/i)).toBeInTheDocument()
  })

  it('does not render fabricated influence/npcs/arcs/last-reaction columns', async () => {
    mockGetCampaignDetail.mockResolvedValue(
      buildDetail({
        factions: [
          {
            id: 'fac-1',
            name: "The Lord's Alliance",
            description: 'desc',
            current_stance: null,
            goals: null,
            content_source: 'llm',
          },
        ],
      })
    )
    renderPage()

    await waitFor(() => {
      expect(screen.getByText("The Lord's Alliance")).toBeInTheDocument()
    })
    expect(screen.queryByText(/influence:/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/last reaction:/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^npcs:/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^arcs:/i)).not.toBeInTheDocument()
  })
})
