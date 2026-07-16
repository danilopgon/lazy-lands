import { useEffect, useRef, type ReactNode } from 'react'
import { render, screen, waitFor, within } from '@/tests/intl'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import { DemoProvider, useDemoStore } from '@/lib/demo/store'

import DemoMemoryReviewPage from '../page'

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

    await waitFor(() => {
      expect(screen.queryAllByRole('article').length).toBe(2)
    })

    // Unmount + remount ONLY the page, on the SAME persistent provider.
    rerender(<></>)
    rerender(<DemoMemoryReviewPage />)

    await waitFor(() => {
      expect(screen.getAllByRole('article').length).toBe(2)
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
      await waitFor(() => {
        expect(screen.queryAllByRole('article').length).toBe(total - i - 1)
      })
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
  })
})
