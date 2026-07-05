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

import ArcsPage from '../page'
import type {
  ArcResponse,
  CampaignDetailResponse,
} from '@/lib/campaigns/schemas'

/** Build a single arc fixture. */
function buildArc(overrides: Partial<ArcResponse> = {}): ArcResponse {
  return {
    id: 'arc-1',
    title: 'The Spider Pact',
    description: 'A deal in the shadows',
    priority: 'high',
    status: 'open',
    content_source: 'llm',
    ...overrides,
  }
}

/** Build a CampaignDetailResponse fixture with overridable arcs. */
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

/** Render the arcs page inside a fresh QueryClientProvider. */
function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ArcsPage />
    </QueryClientProvider>
  )
}

describe('ArcsPage', () => {
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
      buildDetail({ arcs: [buildArc()] })
    )
    await userEvent.click(screen.getByRole('button', { name: /retry/i }))

    await waitFor(() => {
      expect(screen.getByText('The Spider Pact')).toBeInTheDocument()
    })
  })

  it('renders the empty state with the add-arc action', async () => {
    mockGetCampaignDetail.mockResolvedValue(buildDetail({ arcs: [] }))
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('No arcs here')).toBeInTheDocument()
    })
    expect(
      screen.getByRole('button', { name: /add an arc/i })
    ).toBeInTheDocument()
  })

  it('renders title, status, priority, description, and provenance', async () => {
    mockGetCampaignDetail.mockResolvedValue(buildDetail({ arcs: [buildArc()] }))
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('The Spider Pact')).toBeInTheDocument()
    })
    expect(screen.getByText('open')).toBeInTheDocument()
    expect(screen.getByText(/high priority/i)).toBeInTheDocument()
    expect(screen.getByText(/a deal in the shadows/i)).toBeInTheDocument()
    expect(screen.getByText(/scribe/i)).toBeInTheDocument()
  })

  it('counts only open arcs as "threads still in play" and still shows terminal arcs', async () => {
    mockGetCampaignDetail.mockResolvedValue(
      buildDetail({
        arcs: [
          buildArc({ id: 'a1', title: 'Open Thread', status: 'open' }),
          buildArc({ id: 'a2', title: 'Resolved Thread', status: 'resolved' }),
          buildArc({ id: 'a3', title: 'Dropped Thread', status: 'dropped' }),
        ],
      })
    )
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Open Thread')).toBeInTheDocument()
    })
    // Terminal arcs are dimmed but never hidden.
    expect(screen.getByText('Resolved Thread')).toBeInTheDocument()
    expect(screen.getByText('Dropped Thread')).toBeInTheDocument()
    expect(screen.getByText('1 threads still in play')).toBeInTheDocument()
  })

  it('does not render fabricated npcs/factions/last-session or generation controls', async () => {
    mockGetCampaignDetail.mockResolvedValue(buildDetail({ arcs: [buildArc()] }))
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('The Spider Pact')).toBeInTheDocument()
    })
    expect(screen.queryByText(/last session:/i)).not.toBeInTheDocument()
    expect(
      screen.queryByText(/include in next session generation/i)
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/^factions:/i)).not.toBeInTheDocument()
  })
})
