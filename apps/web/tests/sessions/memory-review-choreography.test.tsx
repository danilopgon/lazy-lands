import { act } from 'react'
import { render, screen } from '@/tests/intl'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetCampaignDetail, mockGetMemoryFacts, mockCreateMemoryFact } =
  vi.hoisted(() => ({
    mockGetCampaignDetail: vi.fn(),
    mockGetMemoryFacts: vi.fn(),
    mockCreateMemoryFact: vi.fn(),
  }))

vi.mock('@/lib/sessions/api', () => ({
  recoverMemorySuggestions: vi.fn(),
  SessionCampaignNotFoundError: class extends Error {},
  SessionRateLimitError: class extends Error {},
  SessionNotPlayedError: class extends Error {},
}))

vi.mock('@/lib/campaigns/api', () => ({
  getCampaignDetail: mockGetCampaignDetail,
  CampaignNotFoundError: class extends Error {},
}))

vi.mock('@/lib/memory/api', () => ({
  createMemoryFact: mockCreateMemoryFact,
  getMemoryFacts: mockGetMemoryFacts,
  updateMemoryFact: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'camp-1' }),
  useSearchParams: () => new URLSearchParams('session=session-a'),
}))

import MemoryReviewPage from '@/app/[locale]/campaigns/[id]/memory/review/page'
import { writeMemoryReviewDraft } from '@/lib/sessions/memory-review-draft'
import { CARD_EXIT_MS, STAMP_LIFETIME_MS } from '@/lib/motion/timings'
import {
  MotionModeProvider,
  type MotionMode,
} from '@/lib/motion/use-motion-mode'

const FIRST = /Captain Vess is hiding in the harbor district/
const SECOND = /The harbormaster has been paid to look away/

const MODES: MotionMode[] = ['full', 'subtle', 'off']

/**
 * Seed two pending proposals so sibling isolation stays observable.
 *
 * @returns {void}
 */
function seedDraft() {
  writeMemoryReviewDraft({
    campaign_id: 'camp-1',
    session_id: 'session-a',
    session_number: 7,
    memory_suggestions: [
      {
        content: 'Captain Vess is hiding in the harbor district.',
        type: 'revelation',
        importance: 'medium',
        reason: 'Introduced this session.',
        related: [],
      },
      {
        content: 'The harbormaster has been paid to look away.',
        type: 'tension',
        importance: 'high',
        reason: 'Sets up the next session.',
        related: [],
      },
    ],
  })
}

/**
 * Render the review screen under an explicit motion mode.
 *
 * The inner provider wins over the default the shared test helper mounts, so a
 * single harness can exercise every mode.
 *
 * @param {MotionMode} mode - The motion mode under test.
 * @returns {ReturnType<typeof render>} The render result.
 */
function renderPage(mode: MotionMode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MotionModeProvider mode={mode}>
        <MemoryReviewPage />
      </MotionModeProvider>
    </QueryClientProvider>
  )
}

describe('memory review choreography', () => {
  beforeEach(() => {
    sessionStorage.clear()
    mockGetCampaignDetail.mockResolvedValue({
      id: 'camp-1',
      title: 'Shadows over Phandalin',
    })
    mockGetMemoryFacts.mockResolvedValue([])
    mockCreateMemoryFact.mockResolvedValue({ id: 'fact-1' })
    seedDraft()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it.each(MODES)(
    'removes an accepted card on its own timers under data-motion="%s"',
    async (mode) => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      renderPage(mode)

      const card = await screen.findByText(FIRST)
      const accept = card
        .closest('article')!
        .querySelector<HTMLElement>('button')!
      await user.click(accept)

      await act(async () => {
        vi.advanceTimersByTime(STAMP_LIFETIME_MS - 1)
      })
      expect(screen.getByText(FIRST)).toBeInTheDocument()

      await act(async () => {
        vi.advanceTimersByTime(1 + CARD_EXIT_MS)
      })
      expect(screen.queryByText(FIRST)).not.toBeInTheDocument()
    }
  )

  it.each(MODES)(
    'removes a dismissed card on its own timer under data-motion="%s"',
    async (mode) => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      renderPage(mode)

      const card = await screen.findByText(FIRST)
      const dismiss = card
        .closest('article')!
        .querySelector<HTMLElement>('button.ml-auto')!
      await user.click(dismiss)

      expect(screen.getByText(FIRST)).toBeInTheDocument()

      await act(async () => {
        vi.advanceTimersByTime(CARD_EXIT_MS)
      })
      expect(screen.queryByText(FIRST)).not.toBeInTheDocument()
    }
  )

  it.each(MODES)(
    'exposes the transient phase as state, not styling, under data-motion="%s"',
    async (mode) => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      renderPage(mode)

      const card = await screen.findByText(FIRST)
      const article = card.closest('article')!
      expect(article).not.toHaveAttribute('data-fx')

      await user.click(article.querySelector<HTMLElement>('button.ml-auto')!)

      expect(article).toHaveAttribute('data-fx', 'discarding')
      expect(article).not.toHaveClass('ll-discarding')
    }
  )

  it.each(['subtle', 'off'] as const)(
    'keeps a dismissed card legible until its timer retires it under data-motion="%s"',
    async (mode) => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      renderPage(mode)

      const card = await screen.findByText(FIRST)
      const article = card.closest('article')!
      await user.click(article.querySelector<HTMLElement>('button.ml-auto')!)

      expect(article).toHaveAttribute('data-fx', 'discarding')
      expect(Number(article.style.opacity || '1')).not.toBe(0)
      expect(screen.getByText(FIRST)).toBeVisible()
    }
  )

  it('leaves a sibling card actionable while one accept is in flight', async () => {
    let settle: (value: { id: string }) => void = () => {}
    mockCreateMemoryFact.mockImplementation(
      () =>
        new Promise<{ id: string }>((resolve) => {
          settle = resolve
        })
    )
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPage('full')

    const first = await screen.findByText(FIRST)
    await user.click(
      first.closest('article')!.querySelector<HTMLElement>('button')!
    )

    const second = screen.getByText(SECOND).closest('article')!
    const siblingButtons = second.querySelectorAll('button')
    siblingButtons.forEach((button) => expect(button).not.toBeDisabled())

    await act(async () => {
      settle({ id: 'fact-1' })
    })
  })

  it('keeps the accepted stamp and the busy indicator rendered', async () => {
    let settle: (value: { id: string }) => void = () => {}
    mockCreateMemoryFact.mockImplementation(
      () =>
        new Promise<{ id: string }>((resolve) => {
          settle = resolve
        })
    )
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPage('full')

    const first = await screen.findByText(FIRST)
    await user.click(
      first.closest('article')!.querySelector<HTMLElement>('button')!
    )

    expect(screen.getByText('Stamping')).toBeInTheDocument()

    await act(async () => {
      settle({ id: 'fact-1' })
    })

    expect(screen.getByText('★ Accepted')).toBeInTheDocument()
  })
})
