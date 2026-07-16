import type { ReactNode } from 'react'
import { render, within } from '@/tests/intl'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import { DemoProvider } from '@/lib/demo/store'
import { demoHrefs } from '@/lib/demo/hrefs'

import DemoMemoryReviewPage from '../page'

/**
 * Wraps the demo memory review page in the providers it relies on.
 *
 * @param {object} root0 - Wrapper props.
 * @param {ReactNode} root0.children - The subtree under test.
 * @returns {React.ReactElement} The wrapped subtree.
 */
function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return (
    <QueryClientProvider client={queryClient}>
      <DemoProvider>{children}</DemoProvider>
    </QueryClientProvider>
  )
}

describe('DemoMemoryReviewPage — empty state', () => {
  it('links the primary empty-state action to the demo campaign, not log-session', () => {
    const { container } = render(<DemoMemoryReviewPage />, { wrapper: Wrapper })

    // Scope to the pending-suggestions section: the page footer also carries a
    // "back to campaign" link, so a page-wide query would still pass even if the
    // empty-state action disappeared entirely.
    const pendingSection = container.querySelector('[data-tour="suggestions"]')
    expect(pendingSection).not.toBeNull()

    const emptyStateLink = within(pendingSection as HTMLElement).getByRole(
      'link',
      { name: /campaign/i }
    )
    expect(emptyStateLink.getAttribute('href')).toBe(demoHrefs.campaign)
  })
})
