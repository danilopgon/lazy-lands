import { render, screen, waitFor } from '@/tests/intl'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockGetCampaignDetail,
  mockRegisterSession,
  mockCompleteSession,
  mockGetSessions,
  mockPush,
  mockWriteMemoryReviewDraft,
} = vi.hoisted(() => ({
  mockGetCampaignDetail: vi.fn(),
  mockRegisterSession: vi.fn(),
  mockCompleteSession: vi.fn(),
  mockGetSessions: vi.fn(),
  mockPush: vi.fn(),
  mockWriteMemoryReviewDraft: vi.fn(),
}))

vi.mock('@/lib/campaigns/api', () => ({
  getCampaignDetail: mockGetCampaignDetail,
  CampaignApiError: class CampaignApiError extends Error {},
  CampaignNotFoundError: class CampaignNotFoundError extends Error {},
}))

vi.mock('@/lib/sessions/api', () => ({
  registerSession: mockRegisterSession,
  completeSession: mockCompleteSession,
  getSessions: mockGetSessions,
  SessionApiError: class SessionApiError extends Error {},
  SessionCampaignNotFoundError: class SessionCampaignNotFoundError extends Error {},
}))

vi.mock('@/lib/sessions/memory-review-draft', () => ({
  writeMemoryReviewDraft: mockWriteMemoryReviewDraft,
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'camp-1' }),
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
      children?: import('react').ReactNode
    }) => createElement('a', { href, ...props }, children),
  }
})

import LogSessionPage from '../page'

/** Build a minimal campaign detail fixture for the breadcrumb name. */
function buildCampaignDetail() {
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
  }
}

/** Render the page wrapped in a fresh QueryClientProvider. */
function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <LogSessionPage />
    </QueryClientProvider>
  )
}

describe('LogSessionPage (Block 7a session-log-ui)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCampaignDetail.mockResolvedValue(buildCampaignDetail())
    // No open draft: this screen's contract is the plain register path.
    mockGetSessions.mockResolvedValue([])
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('renders the breadcrumb, kicker, title, and only the two in-scope fields', async () => {
    renderPage()

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /log what happened/i })
      ).toBeInTheDocument()
    })

    expect(screen.getByText('Shadows over Phandalin')).toBeInTheDocument()
    expect(screen.getByText(/after the table clears/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/what happened/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/consequences/i)).toBeInTheDocument()
    // Deferred handoff fields must not be rendered.
    expect(screen.queryByLabelText(/session title/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/session #/i)).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText(/changes to the world state/i)
    ).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/private dm notes/i)).not.toBeInTheDocument()
  })

  it('blocks submit with a field error when summary is empty, no request sent', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('heading', { name: /log what happened/i })
    await user.click(
      screen.getByRole('button', { name: /save session & review memories/i })
    )

    await waitFor(() => {
      expect(
        screen.getByText(/the summary is the one thing the scribe/i)
      ).toBeInTheDocument()
    })
    expect(mockRegisterSession).not.toHaveBeenCalled()
  })

  it('shows the quill loading takeover while saving', async () => {
    const user = userEvent.setup()
    let resolvePromise: (value: unknown) => void
    mockRegisterSession.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve
      })
    )
    renderPage()

    await screen.findByRole('heading', { name: /log what happened/i })
    await user.type(
      screen.getByLabelText(/what happened/i),
      'The party arrived in town.'
    )
    await user.click(
      screen.getByRole('button', { name: /save session & review memories/i })
    )

    await waitFor(() => {
      expect(screen.getByText(/chronicling the session/i)).toBeInTheDocument()
    })
    expect(screen.queryByLabelText(/what happened/i)).not.toBeInTheDocument()

    resolvePromise!({
      session_id: 'sess-1',
      session_number: 1,
      memory_suggestions: [],
    })
  })

  it('stores the returned memory suggestions and opens memory review on success', async () => {
    const user = userEvent.setup()
    mockRegisterSession.mockResolvedValue({
      session_id: 'sess-1',
      session_number: 1,
      memory_suggestions: [
        {
          content: 'Captain Vess owes the party a favor.',
          type: 'relationship',
          importance: 'high',
          reason: 'The favor changes future negotiations.',
          related: ['Captain Vess'],
        },
      ],
    })
    renderPage()

    await screen.findByRole('heading', { name: /log what happened/i })
    await user.type(
      screen.getByLabelText(/what happened/i),
      'The party arrived in town.'
    )
    await user.click(
      screen.getByRole('button', { name: /save session & review memories/i })
    )

    await waitFor(() => {
      expect(mockRegisterSession).toHaveBeenCalledWith('camp-1', {
        summary: 'The party arrived in town.',
      })
      expect(mockWriteMemoryReviewDraft).toHaveBeenCalledWith({
        campaign_id: 'camp-1',
        session_id: 'sess-1',
        session_number: 1,
        memory_suggestions: [
          {
            content: 'Captain Vess owes the party a favor.',
            type: 'relationship',
            importance: 'high',
            reason: 'The favor changes future negotiations.',
            related: ['Captain Vess'],
          },
        ],
      })
      expect(mockPush).toHaveBeenCalledWith(
        '/campaigns/camp-1/memory/review?session=sess-1'
      )
    })
  })

  it('still opens memory review when best-effort draft persistence fails', async () => {
    const user = userEvent.setup()
    mockRegisterSession.mockResolvedValue({
      session_id: 'sess-1',
      session_number: 1,
      memory_suggestions: [],
    })
    mockWriteMemoryReviewDraft.mockImplementation(() => {
      throw new Error('sessionStorage unavailable')
    })
    renderPage()

    await screen.findByRole('heading', { name: /log what happened/i })
    await user.type(
      screen.getByLabelText(/what happened/i),
      'The party arrived in town.'
    )
    await user.click(
      screen.getByRole('button', { name: /save session & review memories/i })
    )

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        '/campaigns/camp-1/memory/review?session=sess-1'
      )
    })
  })

  it('preserves typed text and shows an error notice on failure', async () => {
    const user = userEvent.setup()
    const { SessionApiError } = await import('@/lib/sessions/api')
    mockRegisterSession.mockRejectedValue(
      new SessionApiError('Something went wrong while processing the session.')
    )
    renderPage()

    await screen.findByRole('heading', { name: /log what happened/i })
    await user.type(
      screen.getByLabelText(/what happened/i),
      'The party arrived in town.'
    )
    await user.type(
      screen.getByLabelText(/consequences/i),
      'The guild lost its cache.'
    )
    await user.click(
      screen.getByRole('button', { name: /save session & review memories/i })
    )

    await waitFor(() => {
      expect(screen.getByText(/your text is safe/i)).toBeInTheDocument()
    })
    expect(screen.getByLabelText(/what happened/i)).toHaveValue(
      'The party arrived in town.'
    )
    expect(screen.getByLabelText(/consequences/i)).toHaveValue(
      'The guild lost its cache.'
    )
    expect(mockPush).not.toHaveBeenCalled()
  })
})
