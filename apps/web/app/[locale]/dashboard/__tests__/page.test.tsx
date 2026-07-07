import type { ReactNode } from 'react'
import { render, screen, waitFor } from '@/tests/intl'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetCampaigns, mockPush } = vi.hoisted(() => ({
  mockGetCampaigns: vi.fn(),
  mockPush: vi.fn(),
}))

vi.mock('@/lib/campaigns/api', () => ({
  getCampaigns: mockGetCampaigns,
  CampaignApiError: class CampaignApiError extends Error {},
  CampaignNotFoundError: class CampaignNotFoundError extends Error {},
}))

vi.mock('@/i18n/navigation', async () => {
  const { createElement } = await import('react')
  return {
    useRouter: () => ({ push: mockPush }),
    usePathname: () => '/',
    Link: ({
      href,
      children,
      ...props
    }: {
      href: string
      children?: ReactNode
    }) => createElement('a', { href, ...props }, children),
  }
})

vi.mock('@/components/auth/logout-button', () => ({
  LogoutButton: () => <button type="button">Log out</button>,
}))

import DashboardPage from '../page'
import type { CampaignSummary } from '@/lib/campaigns/schemas'

/** Build a CampaignSummary fixture with sensible defaults. */
function buildCampaign(
  overrides: Partial<CampaignSummary> = {}
): CampaignSummary {
  return {
    id: 'camp-1',
    title: 'Shadows over Phandalin',
    description: 'A mining town in peril',
    system: 'D&D 5e',
    tone: 'Low-magic intrigue',
    updated_at: '2026-06-15T10:00:00Z',
    npc_count: 4,
    faction_count: 2,
    arc_count: 3,
    ...overrides,
  }
}

/** Render the dashboard page wrapped in a fresh QueryClientProvider. */
function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <DashboardPage />
    </QueryClientProvider>
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('renders LoadingScribe while campaigns are being fetched', () => {
    mockGetCampaigns.mockReturnValue(new Promise(() => {}))
    renderPage()

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText(/the scribe is writing/i)).toBeInTheDocument()
  })

  it('renders an error notice with retry action when the fetch fails', async () => {
    mockGetCampaigns.mockRejectedValue(new Error('Network error'))
    renderPage()

    await waitFor(() => {
      expect(
        screen.getByText(/something went wrong while loading your campaigns/i)
      ).toBeInTheDocument()
    })

    const retryButton = screen.getByRole('button', { name: /retry/i })
    expect(retryButton).toBeInTheDocument()
  })

  it('retries the fetch when the retry button is clicked', async () => {
    const user = userEvent.setup()
    mockGetCampaigns.mockRejectedValueOnce(new Error('Network error'))
    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    mockGetCampaigns.mockResolvedValue([buildCampaign()])
    await user.click(screen.getByRole('button', { name: /retry/i }))

    await waitFor(() => {
      expect(screen.getByText('Shadows over Phandalin')).toBeInTheDocument()
    })
  })

  it('renders empty state with CTA when there are no campaigns', async () => {
    mockGetCampaigns.mockResolvedValue([])
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Your chronicle starts here')).toBeInTheDocument()
    })

    const cta = screen.getByRole('link', {
      name: /create your first campaign/i,
    })
    expect(cta).toHaveAttribute('href', '/campaigns/new')
  })

  it('renders empty-search state when search yields no matches', async () => {
    const user = userEvent.setup()
    mockGetCampaigns.mockResolvedValue([buildCampaign()])
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Shadows over Phandalin')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/search campaigns/i)
    await user.type(searchInput, 'zzzznonexistent')

    expect(
      screen.getByText('No campaigns match that search')
    ).toBeInTheDocument()
  })

  it('renders a CampaignCard for each campaign with title, system, and tone', async () => {
    mockGetCampaigns.mockResolvedValue([
      buildCampaign(),
      buildCampaign({
        id: 'camp-2',
        title: 'The Salt Road',
        system: 'Pathfinder 2e',
        tone: 'High adventure',
      }),
    ])
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Shadows over Phandalin')).toBeInTheDocument()
    })

    expect(screen.getByText('The Salt Road')).toBeInTheDocument()
    expect(screen.getByText('D&D 5e · Low-magic intrigue')).toBeInTheDocument()
    expect(
      screen.getByText('Pathfinder 2e · High adventure')
    ).toBeInTheDocument()
  })

  it('filters cards by name and system and updates the helper text', async () => {
    const user = userEvent.setup()
    mockGetCampaigns.mockResolvedValue([
      buildCampaign(),
      buildCampaign({
        id: 'camp-2',
        title: 'The Salt Road',
        system: 'Pathfinder 2e',
        tone: 'High adventure',
      }),
    ])
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Shadows over Phandalin')).toBeInTheDocument()
    })

    expect(screen.getByText('2 of 2')).toBeInTheDocument()

    const searchInput = screen.getByPlaceholderText(/search campaigns/i)
    await user.type(searchInput, 'salt')

    expect(screen.queryByText('Shadows over Phandalin')).not.toBeInTheDocument()
    expect(screen.getByText('The Salt Road')).toBeInTheDocument()
    expect(screen.getByText('1 of 2')).toBeInTheDocument()
  })

  it('"+ New campaign" button navigates to /campaigns/new', async () => {
    const user = userEvent.setup()
    mockGetCampaigns.mockResolvedValue([buildCampaign()])
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Shadows over Phandalin')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /\+ new campaign/i }))
    expect(mockPush).toHaveBeenCalledWith('/campaigns/new')
    expect(screen.getByRole('link', { name: 'ES' })).toHaveAttribute(
      'href',
      '/es'
    )
  })

  it('each campaign card links to the campaign detail page', async () => {
    mockGetCampaigns.mockResolvedValue([buildCampaign()])
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Shadows over Phandalin')).toBeInTheDocument()
    })

    const card = screen.getByText('Shadows over Phandalin').closest('a')
    expect(card).not.toBeNull()
    expect(card).toHaveAttribute('href', '/campaigns/camp-1')
  })

  it('renders NPC, faction, and arc counts on each card', async () => {
    mockGetCampaigns.mockResolvedValue([
      buildCampaign({ npc_count: 5, faction_count: 3, arc_count: 1 }),
    ])
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Shadows over Phandalin')).toBeInTheDocument()
    })

    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('NPCs')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Factions')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('Arcs')).toBeInTheDocument()
  })

  it('renders Sessions and Memories as "—" placeholders (Block 7 — not yet data-bound)', async () => {
    mockGetCampaigns.mockResolvedValue([buildCampaign()])
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Shadows over Phandalin')).toBeInTheDocument()
    })

    expect(screen.getByText('Sessions')).toBeInTheDocument()
    expect(screen.getByText('Memories')).toBeInTheDocument()
    // Two placeholder columns, both showing an em dash instead of a count.
    expect(screen.getAllByText('—')).toHaveLength(2)
  })

  it('shows the campaign count and session summary in the subtitle', async () => {
    mockGetCampaigns.mockResolvedValue([
      buildCampaign(),
      buildCampaign({ id: 'camp-2', title: 'Another' }),
    ])
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('2 campaigns')).toBeInTheDocument()
    })
  })
})
