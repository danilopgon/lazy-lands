import { render, screen, waitFor } from '@/tests/intl'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockRegisterSession, mockPush, mockWriteMemoryReviewDraft } =
  vi.hoisted(() => ({
    mockRegisterSession: vi.fn(),
    mockPush: vi.fn(),
    mockWriteMemoryReviewDraft: vi.fn(),
  }))

vi.mock('@/lib/sessions/api', () => ({
  registerSession: mockRegisterSession,
  SessionApiError: class SessionApiError extends Error {},
}))

vi.mock('@/lib/sessions/memory-review-draft', () => ({
  writeMemoryReviewDraft: mockWriteMemoryReviewDraft,
}))

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

import { LogSessionForm } from '@/components/sessions/log-session-form'

const RESPONSE = {
  session_id: 'session-1',
  session_number: 8,
  memory_suggestions: [],
}

/** Render the log-session form inside a fresh QueryClientProvider. */
function renderForm(
  props: Partial<React.ComponentProps<typeof LogSessionForm>> = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <LogSessionForm campaignId="camp-1" {...props} />
    </QueryClientProvider>
  )
}

describe('LogSessionForm — default (real) path', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers via the real client, persists the draft, and navigates to the default review href', async () => {
    const user = userEvent.setup()
    mockRegisterSession.mockResolvedValue(RESPONSE)
    renderForm()

    await user.type(
      screen.getByLabelText(/what happened/i),
      'The party reached the keep.'
    )
    await user.click(
      screen.getByRole('button', { name: /save session & review memories/i })
    )

    await waitFor(() => {
      expect(mockRegisterSession).toHaveBeenCalledWith(
        'camp-1',
        expect.objectContaining({ summary: 'The party reached the keep.' })
      )
    })
    expect(mockWriteMemoryReviewDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        campaign_id: 'camp-1',
        session_id: 'session-1',
      })
    )
    expect(mockPush).toHaveBeenCalledWith(
      '/campaigns/camp-1/memory/review?session=session-1'
    )
  })
})

describe('LogSessionForm — injected adapter props', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses registerSessionFn/navigate/persistDraft/reviewHref instead of the real client', async () => {
    const user = userEvent.setup()
    const registerSessionFn = vi.fn().mockResolvedValue(RESPONSE)
    const navigate = vi.fn()
    const reviewHref = vi.fn().mockReturnValue('/demo/memory')

    renderForm({
      registerSessionFn,
      navigate,
      persistDraft: false,
      reviewHref,
    })

    await user.type(
      screen.getByLabelText(/what happened/i),
      'The party reached the keep.'
    )
    await user.click(
      screen.getByRole('button', { name: /save session & review memories/i })
    )

    await waitFor(() => {
      expect(registerSessionFn).toHaveBeenCalledWith(
        'camp-1',
        expect.objectContaining({ summary: 'The party reached the keep.' })
      )
    })
    expect(mockRegisterSession).not.toHaveBeenCalled()
    expect(mockWriteMemoryReviewDraft).not.toHaveBeenCalled()
    expect(reviewHref).toHaveBeenCalledWith({
      campaignId: 'camp-1',
      sessionId: 'session-1',
    })
    expect(navigate).toHaveBeenCalledWith('/demo/memory')
    expect(mockPush).not.toHaveBeenCalled()
  })
})
