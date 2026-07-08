import { render, screen, waitFor, within } from '@/tests/intl'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetCampaignDetail, mockCreateArc, mockUpdateArc, mockDeleteArc } =
  vi.hoisted(() => ({
    mockGetCampaignDetail: vi.fn(),
    mockCreateArc: vi.fn(),
    mockUpdateArc: vi.fn(),
    mockDeleteArc: vi.fn(),
  }))

vi.mock('@/lib/campaigns/api', () => ({
  getCampaignDetail: mockGetCampaignDetail,
  createArc: mockCreateArc,
  updateArc: mockUpdateArc,
  deleteArc: mockDeleteArc,
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
    status: 'active',
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
    // The status badge is a span; the filter bar also has an "Active" pill
    // (a button), so scope this to the badge.
    expect(screen.getByText('Active', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText(/high priority/i)).toBeInTheDocument()
    expect(screen.getByText(/a deal in the shadows/i)).toBeInTheDocument()
    expect(screen.getByText(/scribe/i)).toBeInTheDocument()
  })

  it('counts active/dormant arcs as "threads still in play" and still shows terminal arcs', async () => {
    mockGetCampaignDetail.mockResolvedValue(
      buildDetail({
        arcs: [
          buildArc({ id: 'a1', title: 'Active Thread', status: 'active' }),
          buildArc({ id: 'a2', title: 'Dormant Thread', status: 'dormant' }),
          buildArc({ id: 'a3', title: 'Resolved Thread', status: 'resolved' }),
          buildArc({
            id: 'a4',
            title: 'Discarded Thread',
            status: 'discarded',
          }),
        ],
      })
    )
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Active Thread')).toBeInTheDocument()
    })
    // Terminal arcs are dimmed but never hidden.
    expect(screen.getByText('Dormant Thread')).toBeInTheDocument()
    expect(screen.getByText('Resolved Thread')).toBeInTheDocument()
    expect(screen.getByText('Discarded Thread')).toBeInTheDocument()
    expect(screen.getByText('2 threads still in play')).toBeInTheDocument()
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

  it('creates an arc via createArc with default active/medium codes', async () => {
    const user = userEvent.setup()
    mockGetCampaignDetail.mockResolvedValue(buildDetail({ arcs: [] }))
    mockCreateArc.mockResolvedValue(buildArc({ id: 'arc-new' }))
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('No arcs here')).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /add an arc/i }))
    await user.type(screen.getByLabelText(/title/i), 'A new thread')
    await user.click(screen.getByRole('button', { name: /add arc/i }))

    await waitFor(() => {
      expect(mockCreateArc).toHaveBeenCalledWith(
        expect.objectContaining({
          campaign_id: 'camp-1',
          title: 'A new thread',
          priority: 'medium',
          status: 'active',
        })
      )
    })
  })

  it('edits an arc via updateArc and deletes via the confirm modal', async () => {
    const user = userEvent.setup()
    mockGetCampaignDetail.mockResolvedValue(buildDetail({ arcs: [buildArc()] }))
    mockUpdateArc.mockResolvedValue(buildArc())
    mockDeleteArc.mockResolvedValue(undefined)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('The Spider Pact')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /^edit$/i }))
    expect(screen.getByLabelText(/title/i)).toHaveValue('The Spider Pact')
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    await waitFor(() => {
      expect(mockUpdateArc).toHaveBeenCalledWith('arc-1', expect.any(Object))
    })

    await user.click(screen.getByRole('button', { name: /^delete$/i }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /^delete$/i }))
    await waitFor(() => {
      expect(mockDeleteArc).toHaveBeenCalledWith('arc-1')
    })
  })

  it('filters arcs by status and shows a no-match message when none match', async () => {
    const user = userEvent.setup()
    mockGetCampaignDetail.mockResolvedValue(
      buildDetail({
        arcs: [
          buildArc({ id: 'a1', title: 'Active Thread', status: 'active' }),
          buildArc({ id: 'a2', title: 'Resolved Thread', status: 'resolved' }),
        ],
      })
    )
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Active Thread')).toBeInTheDocument()
    })

    // Filter to Resolved: only the resolved arc remains visible.
    await user.click(screen.getByRole('button', { name: 'Resolved' }))
    expect(screen.queryByText('Active Thread')).not.toBeInTheDocument()
    expect(screen.getByText('Resolved Thread')).toBeInTheDocument()

    // Filter to Discarded: nothing matches → the no-match notice, not the
    // "no arcs yet" empty state.
    await user.click(screen.getByRole('button', { name: 'Discarded' }))
    expect(screen.getByText(/no arcs match this filter/i)).toBeInTheDocument()
    expect(screen.queryByText('No arcs here')).not.toBeInTheDocument()
  })
})
