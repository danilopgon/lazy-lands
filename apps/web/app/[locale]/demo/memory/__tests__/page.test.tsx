import type { ReactNode } from 'react'
import { render, screen } from '@/tests/intl'
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
    render(<DemoMemoryReviewPage />, { wrapper: Wrapper })

    const links = screen.getAllByRole('link', { name: /campaign/i })
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(link.getAttribute('href')).toBe(demoHrefs.campaign)
    }
  })
})
