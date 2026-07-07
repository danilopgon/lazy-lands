import { render, screen, waitFor, within } from '@/tests/intl'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetCampaignDetail, mockCreateNpc, mockUpdateNpc, mockDeleteNpc } =
  vi.hoisted(() => ({
    mockGetCampaignDetail: vi.fn(),
    mockCreateNpc: vi.fn(),
    mockUpdateNpc: vi.fn(),
    mockDeleteNpc: vi.fn(),
  }))

vi.mock('@/lib/campaigns/api', () => ({
  getCampaignDetail: mockGetCampaignDetail,
  createNpc: mockCreateNpc,
  updateNpc: mockUpdateNpc,
  deleteNpc: mockDeleteNpc,
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

  const ONE_NPC = {
    id: 'npc-1',
    name: 'Sildar Hallwinter',
    description: 'A retired soldier',
    current_state: 'Recovering',
    motivation: 'Restore order',
    content_source: 'llm' as const,
  }

  it('opens an empty create modal from "+ New NPC" and disables Save until named', async () => {
    const user = userEvent.setup()
    mockGetCampaignDetail.mockResolvedValue(buildDetail({ npcs: [] }))
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('No NPCs yet')).toBeInTheDocument()
    })
    await user.click(
      screen.getByRole('button', { name: /add your first npc/i })
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    const save = screen.getByRole('button', { name: /add npc/i })
    expect(save).toBeDisabled()

    await user.type(screen.getByLabelText(/name/i), 'Toblen')
    expect(save).toBeEnabled()
  })

  it('submits a new NPC via createNpc with content_source omitted', async () => {
    const user = userEvent.setup()
    mockGetCampaignDetail.mockResolvedValue(buildDetail({ npcs: [] }))
    mockCreateNpc.mockResolvedValue({ ...ONE_NPC, id: 'npc-new' })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('No NPCs yet')).toBeInTheDocument()
    })
    await user.click(
      screen.getByRole('button', { name: /add your first npc/i })
    )
    await user.type(screen.getByLabelText(/name/i), 'Toblen')
    await user.click(screen.getByRole('button', { name: /add npc/i }))

    await waitFor(() => {
      expect(mockCreateNpc).toHaveBeenCalledWith(
        expect.objectContaining({ campaign_id: 'camp-1', name: 'Toblen' })
      )
    })
    expect(mockCreateNpc.mock.calls[0][0]).not.toHaveProperty('content_source')
  })

  it('pre-fills the edit modal and submits via updateNpc', async () => {
    const user = userEvent.setup()
    mockGetCampaignDetail.mockResolvedValue(buildDetail({ npcs: [ONE_NPC] }))
    mockUpdateNpc.mockResolvedValue(ONE_NPC)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Sildar Hallwinter')).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /^edit$/i }))

    expect(screen.getByLabelText(/name/i)).toHaveValue('Sildar Hallwinter')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(mockUpdateNpc).toHaveBeenCalledWith(
        'npc-1',
        expect.objectContaining({ name: 'Sildar Hallwinter' })
      )
    })
  })

  it('deletes an NPC through the confirm modal', async () => {
    const user = userEvent.setup()
    mockGetCampaignDetail.mockResolvedValue(buildDetail({ npcs: [ONE_NPC] }))
    mockDeleteNpc.mockResolvedValue(undefined)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Sildar Hallwinter')).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /^delete$/i }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /^delete$/i }))

    await waitFor(() => {
      expect(mockDeleteNpc).toHaveBeenCalledWith('npc-1')
    })
  })
})
