import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { render, screen, waitFor } from '@/tests/intl'
import { PrepareSessionView } from '@/components/sessions/prepare-session-form'

function withQueryClient({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  )
}

function renderPrepare(ui: React.ReactElement) {
  return render(ui, { wrapper: withQueryClient })
}

const campaign = {
  id: 'camp-1',
  title: 'Sombras sobre Phandalin',
  sessionNumber: 8,
  contextRows: [
    ['Campaign summary', 'Accumulated across 7 sessions'],
    ['Last session', 'VII · The Warehouse Fire'],
    ['World state', 'As edited by you, after Session 7'],
    ['Active NPCs', '5 active, 2 with pending grudges'],
    ['Factions', '4 tracked, Black Bear Guild suspiciously quiet'],
    ['Open arcs', '3 included · 1 excluded (Cryovain)'],
    ['Accepted memories', '5 active memories will inform the draft'],
  ] as const,
}

describe('PrepareSessionView', () => {
  it('renders the handoff form with context rows and direction fields', () => {
    renderPrepare(
      <PrepareSessionView campaignId="camp-1" campaign={campaign} />
    )

    expect(screen.getByText('Before the next table')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Prepare Session 8' })
    ).toBeInTheDocument()
    expect(screen.getByText('What the Scribe will read')).toBeInTheDocument()
    expect(screen.getAllByText('Included')).toHaveLength(7)
    expect(
      screen.getByLabelText(/Desired goal for the session/i)
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/Tone/i)).toHaveValue(
      'Keep current, low-magic intrigue'
    )
    expect(
      screen.getByRole('button', { name: 'Prepare session proposal →' })
    ).toBeInTheDocument()
  })

  it('shows a full loading takeover while generation is pending', async () => {
    const generate = vi.fn(() => new Promise<never>(() => {}))
    renderPrepare(
      <PrepareSessionView
        campaignId="camp-1"
        campaign={campaign}
        generateSessionFn={generate}
      />
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Prepare session proposal →' })
    )

    expect(screen.getByRole('status')).toHaveTextContent('Drafting Session 8')
  })

  it('keeps typed direction and shows retry notice after generation failure', async () => {
    const generate = vi.fn().mockRejectedValue(new Error('malformed'))
    renderPrepare(
      <PrepareSessionView
        campaignId="camp-1"
        campaign={campaign}
        generateSessionFn={generate}
      />
    )

    await userEvent.type(
      screen.getByLabelText(/Anything else for the Scribe/i),
      'fail safely'
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Prepare session proposal →' })
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "The Scribe's draft came back malformed"
    )
    expect(screen.getByLabelText(/Anything else for the Scribe/i)).toHaveValue(
      'fail safely'
    )
    expect(
      screen.getByRole('button', { name: 'Try again' })
    ).toBeInTheDocument()
  })

  it('redirects to the generated session view on success', async () => {
    const push = vi.fn()
    const generate = vi.fn().mockResolvedValue({ id: 'session-8' })
    renderPrepare(
      <PrepareSessionView
        campaignId="camp-1"
        campaign={campaign}
        generateSessionFn={generate}
        navigate={push}
      />
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Prepare session proposal →' })
    )

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/campaigns/camp-1/sessions/session-8')
    )
  })
})
