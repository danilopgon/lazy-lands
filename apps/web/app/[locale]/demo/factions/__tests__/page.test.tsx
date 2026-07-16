import type { ReactNode } from 'react'
import { render, screen, waitFor } from '@/tests/intl'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import { DemoProvider } from '@/lib/demo/store'
import { demoCampaign } from '@/lib/demo/fixtures'

import DemoFactionsPage from '../page'

/**
 * Wrap the demo factions page in the query + demo providers it relies on.
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

/** Render the demo factions page with all required providers. */
function renderPage() {
  return render(<DemoFactionsPage />, { wrapper: Wrapper })
}

describe('DemoFactionsPage', () => {
  it('renders the seeded fixture factions with no fetch', () => {
    renderPage()

    expect(screen.getByText('Black Bear Guild')).toBeInTheDocument()
    expect(screen.getByText('Crimson Blades')).toBeInTheDocument()
    expect(
      screen.getByText(demoCampaign.factions[0].current_stance as string, {
        exact: false,
      })
    ).toBeInTheDocument()
  })

  it('creates a new faction against local state', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /new faction/i }))
    await user.type(screen.getByLabelText(/name/i), 'The Silver Hand')
    await user.click(screen.getByRole('button', { name: /add faction/i }))

    await waitFor(() => {
      expect(screen.getByText('The Silver Hand')).toBeInTheDocument()
    })
  })
})
