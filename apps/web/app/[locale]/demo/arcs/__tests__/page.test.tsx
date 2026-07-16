import type { ReactNode } from 'react'
import { render, screen, waitFor } from '@/tests/intl'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import { DemoProvider } from '@/lib/demo/store'
import { demoCampaign } from '@/lib/demo/fixtures'

import DemoArcsPage from '../page'

/**
 * Wrap the demo arcs page in the query + demo providers it relies on.
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

/** Render the demo arcs page with all required providers. */
function renderPage() {
  return render(<DemoArcsPage />, { wrapper: Wrapper })
}

describe('DemoArcsPage', () => {
  it('renders the seeded fixture arcs with no fetch', () => {
    renderPage()

    expect(
      screen.getByText('Recover the stolen anti-dragon plans')
    ).toBeInTheDocument()
    expect(screen.getByText("Robert Herman's revenge")).toBeInTheDocument()
    expect(
      screen.getByText(demoCampaign.arcs[0].description as string, {
        exact: false,
      })
    ).toBeInTheDocument()
  })

  it('creates a new arc against local state', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /new arc/i }))
    await user.type(screen.getByLabelText(/title/i), 'The Lost Caravan')
    await user.click(screen.getByRole('button', { name: /add arc/i }))

    await waitFor(() => {
      expect(screen.getByText('The Lost Caravan')).toBeInTheDocument()
    })
  })
})
