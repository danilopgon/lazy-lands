import { render, screen, waitFor } from '@/tests/intl'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetCampaignDetail, mockRegisterSession, mockPush } = vi.hoisted(
  () => ({
    mockGetCampaignDetail: vi.fn(),
    mockRegisterSession: vi.fn(),
    mockPush: vi.fn(),
  })
)

vi.mock('@/lib/campaigns/api', () => ({
  getCampaignDetail: mockGetCampaignDetail,
  CampaignApiError: class CampaignApiError extends Error {},
  CampaignNotFoundError: class CampaignNotFoundError extends Error {},
}))

vi.mock('@/lib/sessions/api', () => ({
  registerSession: mockRegisterSession,
  SessionApiError: class SessionApiError extends Error {},
  SessionCampaignNotFoundError: class SessionCampaignNotFoundError extends Error {},
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

  it('navigates to the campaign detail page on success (not /memory/review)', async () => {
    const user = userEvent.setup()
    mockRegisterSession.mockResolvedValue({
      session_id: 'sess-1',
      session_number: 1,
      memory_suggestions: [],
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
      expect(mockPush).toHaveBeenCalledWith('/campaigns/camp-1')
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
