import type { ReactNode } from 'react'
import { render, screen, waitFor } from '@/tests/intl'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import { DemoProvider } from '@/lib/demo/store'
import { demoCampaign } from '@/lib/demo/fixtures'

import DemoNpcsPage from '../page'

/**
 * Wrap the demo NPCs page in the query + demo providers it relies on.
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

/** Render the demo NPCs page with all required providers. */
function renderPage() {
  return render(<DemoNpcsPage />, { wrapper: Wrapper })
}

describe('DemoNpcsPage', () => {
  it('renders the seeded fixture NPCs with no fetch', () => {
    renderPage()

    expect(screen.getByText('Ander Margaster')).toBeInTheDocument()
    expect(screen.getByText('Halia Thornton')).toBeInTheDocument()
    expect(
      screen.getByText(demoCampaign.npcs[0].current_state as string, {
        exact: false,
      })
    ).toBeInTheDocument()
  })

  it('creates a new NPC against local state', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /new npc/i }))
    await user.type(screen.getByLabelText(/name/i), 'Toblen Stonehill')
    await user.click(screen.getByRole('button', { name: /add npc/i }))

    await waitFor(() => {
      expect(screen.getByText('Toblen Stonehill')).toBeInTheDocument()
    })
  })
})
