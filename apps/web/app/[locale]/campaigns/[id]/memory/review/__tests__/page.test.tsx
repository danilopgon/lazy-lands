import { render, screen, waitFor } from '@/tests/intl'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockGetCampaignDetail,
  mockGetMemoryFacts,
  mockCreateMemoryFact,
  mockUpdateMemoryFact,
  mockReadMemoryReviewDraft,
  mockCompleteMemoryReviewDraft,
  mockPush,
} = vi.hoisted(() => ({
  mockGetCampaignDetail: vi.fn(),
  mockGetMemoryFacts: vi.fn(),
  mockCreateMemoryFact: vi.fn(),
  mockUpdateMemoryFact: vi.fn(),
  mockReadMemoryReviewDraft: vi.fn(),
  mockCompleteMemoryReviewDraft: vi.fn(),
  mockPush: vi.fn(),
}))

vi.mock('@/lib/campaigns/api', () => ({
  getCampaignDetail: mockGetCampaignDetail,
  CampaignApiError: class CampaignApiError extends Error {},
  CampaignNotFoundError: class CampaignNotFoundError extends Error {},
}))

vi.mock('@/lib/memory/api', () => ({
  getMemoryFacts: mockGetMemoryFacts,
  createMemoryFact: mockCreateMemoryFact,
  updateMemoryFact: mockUpdateMemoryFact,
  MemoryApiError: class MemoryApiError extends Error {},
  MemoryCampaignNotFoundError: class MemoryCampaignNotFoundError extends Error {},
}))

vi.mock('@/lib/sessions/memory-review-draft', () => ({
  readMemoryReviewDraft: mockReadMemoryReviewDraft,
  completeMemoryReviewDraft: mockCompleteMemoryReviewDraft,
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'camp-1' }),
  useSearchParams: () => new URLSearchParams('session=sess-1'),
}))

vi.mock('@/i18n/navigation', async () => {
  const { createElement } = await import('react')
  return {
    useRouter: () => ({ push: mockPush }),
    usePathname: () => '/campaigns/camp-1/memory/review',
    Link: ({
      href,
      children,
      ...props
    }: {
      href: string
      children?: React.ReactNode
    }) => createElement('a', { href, ...props }, children),
  }
})

import MemoryReviewPage from '../page'

function buildCampaignDetail() {
  return {
    id: 'camp-1',
    title: 'Shadows over Phandalin',
    description: null,
    world_state: null,
    system: 'D&D 5e',
    tone: 'Intrigue',
    updated_at: '2026-07-09T00:00:00Z',
    npcs: [],
    factions: [],
    arcs: [],
  }
}

const draft = {
  version: 1,
  campaign_id: 'camp-1',
  session_id: 'sess-1',
  session_number: 7,
  memory_suggestions: [
    {
      content: 'Captain Vess owes the party a favor.',
      type: 'relationship',
      importance: 'high',
      reason: 'The favor changes future negotiations.',
      related: ['Captain Vess'],
    },
  ],
}

const activeMemory = {
  id: 'memory-1',
  campaign_id: 'camp-1',
  source_session_id: 'sess-1',
  content: 'The guild remembers the arson.',
  type: 'consequence',
  importance: 'medium',
  status: 'active',
  created_at: '2026-07-09T00:00:00Z',
  updated_at: '2026-07-09T00:00:00Z',
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryReviewPage />
    </QueryClientProvider>
  )
}

describe('MemoryReviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCampaignDetail.mockResolvedValue(buildCampaignDetail())
    mockGetMemoryFacts.mockResolvedValue([activeMemory])
    mockReadMemoryReviewDraft.mockReturnValue(draft)
  })

  it('renders loading while campaign and active memories load', () => {
    mockGetCampaignDetail.mockReturnValue(new Promise(() => {}))

    renderPage()

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText(/opening the margins/i)).toBeInTheDocument()
  })

  it('renders retryable backend error when active memories fail', async () => {
    mockGetMemoryFacts.mockRejectedValue(new Error('network'))

    renderPage()

    await waitFor(() => {
      expect(
        screen.getByText(/could not load active memories/i)
      ).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('renders pending suggestions and active memories from live data', async () => {
    renderPage()

    await screen.findByRole('heading', { name: /the scribe's margins/i })
    expect(screen.getByText(/session 7 · memory review/i)).toBeInTheDocument()
    expect(screen.getByText(/1 suggestion/i)).toBeInTheDocument()
    expect(screen.getByText(/captain vess owes/i)).toBeInTheDocument()
    expect(screen.getByText(/the favor changes future/i)).toBeInTheDocument()
    expect(screen.getByText(/the guild remembers/i)).toBeInTheDocument()
    expect(screen.getByText(/accepted · session 7/i)).toBeInTheDocument()
  })

  it('shows direct-link empty pending and empty active states', async () => {
    mockReadMemoryReviewDraft.mockReturnValue(null)
    mockGetMemoryFacts.mockResolvedValue([])

    renderPage()

    await screen.findByText(/the margins are clean/i)
    expect(screen.getByText(/no suggestions await review/i)).toBeInTheDocument()
    expect(screen.getByText(/no memories yet/i)).toBeInTheDocument()
  })

  it('accepts, edits, dismisses, and retires with busy-safe calls', async () => {
    const user = userEvent.setup()
    mockCreateMemoryFact.mockResolvedValue({ ...activeMemory, id: 'memory-2' })
    mockUpdateMemoryFact.mockResolvedValue({
      ...activeMemory,
      status: 'archived',
    })

    renderPage()

    await user.click(
      await screen.findByRole('button', { name: /edit & accept/i })
    )
    await user.clear(screen.getByRole('textbox', { name: /memory text/i }))
    await user.type(
      screen.getByRole('textbox', { name: /memory text/i }),
      'Captain Vess now owes the wizard a private favor.'
    )
    await user.click(
      screen.getByRole('button', { name: /save & accept as memory/i })
    )

    await waitFor(() => {
      expect(mockCreateMemoryFact).toHaveBeenCalledWith('camp-1', {
        source_session_id: 'sess-1',
        content: 'Captain Vess now owes the wizard a private favor.',
        type: 'relationship',
        importance: 'high',
      })
    })
    expect(screen.getByText(/edited & stamped/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /retire/i }))
    await waitFor(() => {
      expect(mockUpdateMemoryFact).toHaveBeenCalledWith('memory-1', {
        status: 'archived',
      })
    })
  })

  it('dismisses a suggestion without creating a memory fact', async () => {
    const user = userEvent.setup()

    renderPage()

    await user.click(await screen.findByRole('button', { name: /dismiss/i }))

    await waitFor(() => {
      expect(screen.getByText(/struck out/i)).toBeInTheDocument()
    })
    expect(mockCreateMemoryFact).not.toHaveBeenCalled()
  })
})
