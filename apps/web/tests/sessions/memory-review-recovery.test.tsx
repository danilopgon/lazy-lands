import { render, screen, waitFor } from '@/tests/intl'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockRecoverMemorySuggestions,
  mockGetCampaignDetail,
  mockGetMemoryFacts,
  mockCreateMemoryFact,
  mockUpdateMemoryFact,
  searchParamsRef,
} = vi.hoisted(() => ({
  mockRecoverMemorySuggestions: vi.fn(),
  mockGetCampaignDetail: vi.fn(),
  mockGetMemoryFacts: vi.fn(),
  mockCreateMemoryFact: vi.fn(),
  mockUpdateMemoryFact: vi.fn(),
  // Mutable so a test can switch `?session=` while a recovery is still in
  // flight — the exact race FIX 4 guards against.
  searchParamsRef: { current: 'session=session-a' },
}))

vi.mock('@/lib/sessions/api', () => ({
  recoverMemorySuggestions: mockRecoverMemorySuggestions,
  SessionCampaignNotFoundError: class SessionCampaignNotFoundError extends Error {},
  SessionRateLimitError: class SessionRateLimitError extends Error {},
  SessionNotPlayedError: class SessionNotPlayedError extends Error {},
}))

vi.mock('@/lib/campaigns/api', () => ({
  getCampaignDetail: mockGetCampaignDetail,
  CampaignNotFoundError: class CampaignNotFoundError extends Error {},
}))

vi.mock('@/lib/memory/api', () => ({
  createMemoryFact: mockCreateMemoryFact,
  getMemoryFacts: mockGetMemoryFacts,
  updateMemoryFact: mockUpdateMemoryFact,
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'camp-1' }),
  useSearchParams: () => new URLSearchParams(searchParamsRef.current),
}))

import MemoryReviewPage from '@/app/[locale]/campaigns/[id]/memory/review/page'
import { SessionNotPlayedError } from '@/lib/sessions/api'
import { readMemoryReviewDraft } from '@/lib/sessions/memory-review-draft'
import type { MemorySuggestion } from '@/lib/sessions/schemas'

const SUGGESTION: MemorySuggestion = {
  content: 'Captain Vess is hiding in the harbor district.',
  type: 'revelation',
  importance: 'medium',
  reason: 'Introduced this session.',
  related: [],
}

// The card renders the content wrapped in typographic quotes, so match on a
// substring rather than the exact string.
const SUGGESTION_TEXT = /Captain Vess is hiding in the harbor district/

/** Build a retry-free client; one per test, reused across rerenders. */
function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

/**
 * Render the review page inside a QueryClientProvider, returning the client so
 * a rerender can reuse it. A `?session=` change is a param-only update on a
 * PERSISTENT client in production — minting a fresh one here would tear down
 * the mutation observer and hide the very race the key guard exists to stop.
 */
function renderPage(queryClient: QueryClient = makeClient()) {
  const result = render(
    <QueryClientProvider client={queryClient}>
      <MemoryReviewPage />
    </QueryClientProvider>
  )
  return { ...result, queryClient }
}

/** Wait for the deferred draft read so the page leaves its loading state. */
async function waitForLoaded() {
  await waitFor(() =>
    expect(screen.getByText(/the margins are clean/i)).toBeInTheDocument()
  )
}

describe('MemoryReviewPage — recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    searchParamsRef.current = 'session=session-a'
    mockGetCampaignDetail.mockResolvedValue({
      id: 'camp-1',
      title: 'The Sunken Vault',
    })
    mockGetMemoryFacts.mockResolvedValue([])
  })

  afterEach(() => {
    vi.restoreAllMocks()
    sessionStorage.clear()
  })

  it('renders recovered proposals even when persisting the draft fails', async () => {
    // Quota exceeded / storage disabled. Persistence is best effort: a
    // successful recovery must never render as a failed one.
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })
    mockRecoverMemorySuggestions.mockResolvedValue({
      memory_suggestions: [SUGGESTION],
    })
    const user = userEvent.setup()
    renderPage()
    await waitForLoaded()

    await user.click(
      screen.getByRole('button', { name: /ask the scribe to read it again/i })
    )

    await waitFor(() =>
      expect(screen.getByText(SUGGESTION_TEXT)).toBeInTheDocument()
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(
      screen.queryByText(/could not finish reading/i)
    ).not.toBeInTheDocument()
  })

  it('says an unplayed session has nothing to remember and withdraws the trigger', async () => {
    // A draft is planned, not played. Asking again can never succeed until the
    // DM records the session, so the DM must not be routed to the retry copy.
    mockRecoverMemorySuggestions.mockRejectedValue(
      new SessionNotPlayedError('This session has not been played yet.')
    )
    const user = userEvent.setup()
    renderPage()
    await waitForLoaded()

    await user.click(
      screen.getByRole('button', { name: /ask the scribe to read it again/i })
    )

    await waitFor(() =>
      expect(screen.getByText(/planned but never played/i)).toBeInTheDocument()
    )
    expect(
      screen.queryByText(/could not finish reading/i)
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/proposed nothing this time/i)
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', {
        name: /ask the scribe to read it again/i,
      })
    ).not.toBeInTheDocument()
  })

  it('ignores a recovery that resolves after the active session changed', async () => {
    let resolveRecovery: (value: {
      memory_suggestions: MemorySuggestion[]
    }) => void = () => {}
    mockRecoverMemorySuggestions.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRecovery = resolve
        })
    )
    const user = userEvent.setup()
    const { rerender, queryClient } = renderPage()
    await waitForLoaded()

    // Recovery fires for session A...
    await user.click(
      screen.getByRole('button', { name: /ask the scribe to read it again/i })
    )

    // ...the DM navigates to session B before it resolves. Same client, same
    // mutation observer — exactly what the router does in production.
    searchParamsRef.current = 'session=session-b'
    rerender(
      <QueryClientProvider client={queryClient}>
        <MemoryReviewPage />
      </QueryClientProvider>
    )
    await waitForLoaded()

    // ...and only then does session A's request land.
    resolveRecovery({ memory_suggestions: [SUGGESTION] })

    await waitFor(() =>
      expect(screen.getByText(/the margins are clean/i)).toBeInTheDocument()
    )
    expect(screen.queryByText(SUGGESTION_TEXT)).not.toBeInTheDocument()
    expect(readMemoryReviewDraft('camp-1', 'session-b')).toBeNull()
  })

  it('seeds the lane and the draft when the session has not changed', async () => {
    mockRecoverMemorySuggestions.mockResolvedValue({
      memory_suggestions: [SUGGESTION],
    })
    const user = userEvent.setup()
    renderPage()
    await waitForLoaded()

    await user.click(
      screen.getByRole('button', { name: /ask the scribe to read it again/i })
    )

    await waitFor(() =>
      expect(screen.getByText(SUGGESTION_TEXT)).toBeInTheDocument()
    )
    expect(
      readMemoryReviewDraft('camp-1', 'session-a')?.memory_suggestions
    ).toEqual([SUGGESTION])
  })
})
