import { useEffect, useRef, type ReactNode } from 'react'
import { render, screen, waitFor, within } from '@/tests/intl'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import { DemoProvider, useDemoStore } from '@/lib/demo/store'
import { fixturesByLocale } from '@/lib/demo/fixtures'
import { CARD_EXIT_MS, STAMP_LIFETIME_MS } from '@/lib/motion/timings'

import DemoMemoryReviewPage from '../page'

/** The demo store seeds suggestions from the en bundle by default. */
const enSuggestions = fixturesByLocale.en.suggestions

/**
 * An accepted card outlives its own stamp on purpose: the demo latency, then
 * the stamp pop + hold, then the exit animation. That is well past `waitFor`'s
 * 1s default, so every "card left the screen" wait must be given room.
 */
const ACCEPT_TIMEOUT_MS = 1000 + STAMP_LIFETIME_MS + CARD_EXIT_MS + 1500

/**
 * Wraps children in a single, persistent {@link DemoProvider} instance so the
 * page can be unmounted and remounted (via `rerender`) WITHOUT re-seeding the
 * store. A fresh provider per mount would reset `state.suggestions` and pass
 * even against the unfixed bug — this harness must never do that.
 *
 * @param {object} root0 - Wrapper props.
 * @param {ReactNode} root0.children - The subtree under test.
 * @returns {React.ReactElement} The wrapped subtree.
 */
function PersistentWrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return (
    <QueryClientProvider client={queryClient}>
      <DemoProvider>{children}</DemoProvider>
    </QueryClientProvider>
  )
}

/**
 * Logs the sample session exactly once against the persistent demo store and
 * exposes the resulting suggestion count for `waitFor` to observe. Mirrors
 * the real flow, where `/demo/sessions/new` resolves `logSession` BEFORE the
 * DM ever navigates to `/demo/memory` — the memory page must never mount
 * while suggestions are still in flight.
 */
function LoggerOnly() {
  const store = useDemoStore()
  const logged = useRef(false)

  useEffect(() => {
    if (logged.current) return
    logged.current = true
    void store.logSession({ summary: 'The party reached the keep.' })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once only
  }, [])

  return <div data-testid="logger-count">{store.suggestions.length}</div>
}

/**
 * Logs the sample session against the persistent store and mounts the
 * memory review page only once suggestions have arrived.
 *
 * @returns {Promise<ReturnType<typeof render>>} The render handle, positioned at the page.
 */
async function logThenMountPage() {
  const handle = render(<LoggerOnly />, { wrapper: PersistentWrapper })
  await waitFor(() => {
    expect(screen.getByTestId('logger-count').textContent).not.toBe('0')
  })
  handle.rerender(<DemoMemoryReviewPage />)
  return handle
}

describe('demo memory review — accept feedback choreography', () => {
  it('holds the stamp readable and only busies the card being accepted', async () => {
    const user = userEvent.setup()
    await logThenMountPage()

    await waitFor(() => {
      expect(screen.getAllByRole('article').length).toBeGreaterThan(1)
    })

    const cards = screen.getAllByRole('article')
    await user.click(
      within(cards[0]).getByRole('button', { name: /^accept as memory$/i })
    )

    // An unrelated accept must never freeze the rest of the margins.
    await waitFor(() => {
      expect(within(cards[0]).getByRole('status')).toHaveTextContent(
        /stamping/i
      )
    })
    expect(
      within(cards[1]).getByRole('button', { name: /^accept as memory$/i })
    ).toBeEnabled()

    // The stamp must survive its own 260ms pop rather than being torn down at
    // ~46% of the way through it.
    const stamp = await within(cards[0]).findByText(/★ accepted/i)
    expect(stamp).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(within(cards[0]).getByText(/★ accepted/i)).toBeInTheDocument()

    await waitFor(
      () => {
        expect(screen.getAllByRole('article').length).toBe(cards.length - 1)
      },
      { timeout: ACCEPT_TIMEOUT_MS }
    )
  }, 15000)
})

describe('demo memory review — remount does not resurrect suggestions', () => {
  it('accept then return: accepted suggestion never reappears, no duplicate fact', async () => {
    const user = userEvent.setup()
    const { rerender } = await logThenMountPage()

    await waitFor(() => {
      expect(screen.getAllByRole('article').length).toBeGreaterThan(0)
    })

    const firstCard = screen.getAllByRole('article')[0]
    await user.click(
      within(firstCard).getByRole('button', { name: /^accept as memory$/i })
    )

    await waitFor(
      () => {
        expect(screen.queryAllByRole('article').length).toBe(2)
      },
      { timeout: ACCEPT_TIMEOUT_MS }
    )

    // Unmount + remount ONLY the page, on the SAME persistent provider.
    rerender(<></>)
    rerender(<DemoMemoryReviewPage />)

    await waitFor(() => {
      expect(screen.getAllByRole('article').length).toBe(2)
    })

    // The accepted suggestion's fact must appear exactly once in canon — a
    // duplicate insertion would slip past the article-count check above.
    expect(screen.getAllByText(enSuggestions[0].content)).toHaveLength(1)
  })

  it('accept then IMMEDIATELY return (within the async accept latency): no resurrection', async () => {
    // Regression guard for the accept-path resurrection WINDOW. `acceptSuggestion`
    // adds the fact synchronously but its promise only settles after the demo
    // latency; if the resolved suggestion is dropped only AFTER that await, a
    // remount during the window re-seeds the still-present suggestion and lets
    // it be accepted twice (duplicate fact). This test remounts right after the
    // click — before the latency settles — so it fails unless the suggestion is
    // dropped synchronously on accept. The other cases wait for the flow to
    // settle first and therefore cannot observe this window.
    const user = userEvent.setup()
    const { rerender } = await logThenMountPage()

    await waitFor(() => {
      expect(screen.getAllByRole('article').length).toBeGreaterThan(0)
    })
    const total = screen.getAllByRole('article').length

    const firstCard = screen.getAllByRole('article')[0]
    await user.click(
      within(firstCard).getByRole('button', { name: /^accept as memory$/i })
    )

    // Remount immediately, WITHOUT waiting for the accept latency to settle.
    rerender(<></>)
    rerender(<DemoMemoryReviewPage />)

    await waitFor(() => {
      expect(screen.queryAllByRole('article').length).toBe(total - 1)
    })
  })

  it('dismiss then return: dismissed suggestion never reappears', async () => {
    const user = userEvent.setup()
    const { rerender } = await logThenMountPage()

    await waitFor(() => {
      expect(screen.getAllByRole('article').length).toBeGreaterThan(0)
    })

    const firstCard = screen.getAllByRole('article')[0]
    await user.click(
      within(firstCard).getByRole('button', { name: /dismiss/i })
    )

    await waitFor(() => {
      expect(screen.queryAllByRole('article').length).toBe(2)
    })

    rerender(<></>)
    rerender(<DemoMemoryReviewPage />)

    await waitFor(() => {
      expect(screen.getAllByRole('article').length).toBe(2)
    })
  })

  it('accept all then return: no duplicate facts and empty state renders', async () => {
    const user = userEvent.setup()
    const { rerender } = await logThenMountPage()

    await waitFor(() => {
      expect(screen.getAllByRole('article').length).toBeGreaterThan(0)
    })

    let cards = screen.getAllByRole('article')
    const total = cards.length

    for (let i = 0; i < total; i += 1) {
      cards = screen.getAllByRole('article')
      await user.click(
        within(cards[0]).getByRole('button', { name: /^accept as memory$/i })
      )
      await waitFor(
        () => {
          expect(screen.queryAllByRole('article').length).toBe(total - i - 1)
        },
        { timeout: ACCEPT_TIMEOUT_MS }
      )
    }

    rerender(<></>)
    rerender(<DemoMemoryReviewPage />)

    await waitFor(() => {
      expect(screen.queryAllByRole('article').length).toBe(0)
    })

    const activeItems = screen.getAllByText(
      /The party reached the keep|accepted/i
    )
    expect(activeItems.length).toBeGreaterThan(0)

    // Every accepted suggestion must land in canon exactly once — no duplicate
    // facts hiding behind the empty-state / article-count assertions.
    for (const suggestion of enSuggestions) {
      expect(screen.getAllByText(suggestion.content)).toHaveLength(1)
    }
    // Every accept waits out a full stamp lifetime, so this walk needs more
    // than the default 5s test budget.
  }, 30000)
})
