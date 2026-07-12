import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { render, screen, waitFor } from '@/tests/intl'
import { SessionExportView } from '@/components/sessions/session-export-view'
import type { SessionDetail } from '@/lib/sessions/schemas'

function withQueryClient({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  )
}

function renderExport(ui: React.ReactElement) {
  return render(ui, { wrapper: withQueryClient })
}

/** A promise whose settlement is controlled by the test, to freeze the export mid-flight. */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const campaign = { id: 'camp-1', title: 'Sombras sobre Phandalin' }

const session: SessionDetail = {
  id: 'session-8',
  campaign_id: 'camp-1',
  session_number: 8,
  summary: null,
  consequences: null,
  generated_content: {
    sections: [
      {
        id: 'synopsis',
        label: 'Synopsis',
        body: 'Halia offers silence for a quiet job.',
        origin: 'scribe',
      },
      {
        id: 'goal',
        label: 'Session goal',
        body: 'Break the siege before dawn.',
        origin: 'edited',
      },
      {
        id: 'beats',
        label: 'Main beats',
        body: 'The bell tolls thrice.',
        origin: 'scribe',
      },
    ],
  },
  trace_json: {},
  created_at: null,
  updated_at: null,
}

const nonExportableSession: SessionDetail = {
  ...session,
  generated_content: null,
}

describe('SessionExportView', () => {
  it('renders the ready state: header, all sections checked, count, and selected preview', () => {
    renderExport(
      <SessionExportView
        campaignId="camp-1"
        sessionId="session-8"
        campaign={campaign}
        session={session}
        downloadFn={vi.fn()}
      />
    )

    expect(screen.getByText('Session 8 · Export')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Take it to the table' })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Private DM notes stay out of the document/)
    ).toBeInTheDocument()
    expect(screen.getByText('Include in PDF')).toBeInTheDocument()

    const synopsis = screen.getByRole('checkbox', { name: /Synopsis/ })
    const goal = screen.getByRole('checkbox', { name: /Session goal/ })
    const beats = screen.getByRole('checkbox', { name: /Main beats/ })
    expect(synopsis).toBeChecked()
    expect(goal).toBeChecked()
    expect(beats).toBeChecked()

    expect(
      screen.getByText('3 of 3 sections · A4 portrait')
    ).toBeInTheDocument()

    // Selected-only preview shows every checked section body plus the footer.
    expect(
      screen.getByText('Halia offers silence for a quiet job.')
    ).toBeInTheDocument()
    expect(screen.getByText('Break the siege before dawn.')).toBeInTheDocument()
    expect(
      screen.getByText('Chronicled with Lazy Lands · Edited by the DM')
    ).toBeInTheDocument()
  })

  it('marks an edited section with the OriginBadge edited marker', () => {
    renderExport(
      <SessionExportView
        campaignId="camp-1"
        sessionId="session-8"
        campaign={campaign}
        session={session}
        downloadFn={vi.fn()}
      />
    )

    // Exactly one section (goal) is edited.
    expect(screen.getByText('✎ Edited by you')).toBeInTheDocument()
  })

  it('toggling a section updates the count and removes it from the preview without mutating the draft', async () => {
    const user = userEvent.setup()
    renderExport(
      <SessionExportView
        campaignId="camp-1"
        sessionId="session-8"
        campaign={campaign}
        session={session}
        downloadFn={vi.fn()}
      />
    )

    await user.click(screen.getByRole('checkbox', { name: /Session goal/ }))

    expect(
      screen.getByText('2 of 3 sections · A4 portrait')
    ).toBeInTheDocument()
    // The unselected body leaves the preview; its control label stays listed.
    expect(
      screen.queryByText('Break the siege before dawn.')
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: /Session goal/ })
    ).not.toBeChecked()
  })

  it('excludes private DM notes: a disabled, unchecked control never previewed or requested', async () => {
    const user = userEvent.setup()
    const downloadFn = vi.fn().mockResolvedValue('session-8.pdf')
    renderExport(
      <SessionExportView
        campaignId="camp-1"
        sessionId="session-8"
        campaign={campaign}
        session={session}
        downloadFn={downloadFn}
      />
    )

    const notes = screen.getByRole('checkbox', { name: /Private DM notes/ })
    expect(notes).toBeDisabled()
    expect(notes).not.toBeChecked()
    expect(screen.getByText('Never exported')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Download PDF' }))

    // Only persisted section ids travel to the backend — never a notes token.
    expect(downloadFn).toHaveBeenCalledWith('session-8', [
      'synopsis',
      'goal',
      'beats',
    ])
  })

  it('requests only the selected section ids, in persisted order', async () => {
    const user = userEvent.setup()
    const downloadFn = vi.fn().mockResolvedValue('session-8.pdf')
    renderExport(
      <SessionExportView
        campaignId="camp-1"
        sessionId="session-8"
        campaign={campaign}
        session={session}
        downloadFn={downloadFn}
      />
    )

    await user.click(screen.getByRole('checkbox', { name: /Session goal/ }))
    await user.click(screen.getByRole('button', { name: 'Download PDF' }))

    expect(downloadFn).toHaveBeenCalledWith('session-8', ['synopsis', 'beats'])
  })

  it('shows the quill loading and prevents duplicate requests while exporting', async () => {
    const user = userEvent.setup()
    const control = deferred<string>()
    const downloadFn = vi.fn(() => control.promise)
    renderExport(
      <SessionExportView
        campaignId="camp-1"
        sessionId="session-8"
        campaign={campaign}
        session={session}
        downloadFn={downloadFn}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Download PDF' }))

    expect(await screen.findByText('Pressing the pages')).toBeInTheDocument()
    const downloading = screen.getByRole('button', { name: 'Exporting…' })
    expect(downloading).toBeDisabled()

    // A second attempt while the first is in flight must not fire again.
    await user.click(downloading)
    expect(downloadFn).toHaveBeenCalledTimes(1)

    control.resolve('session-8.pdf')
  })

  it('shows a success notice with the filename and preserves the selection', async () => {
    const user = userEvent.setup()
    const downloadFn = vi.fn().mockResolvedValue('session-8.pdf')
    renderExport(
      <SessionExportView
        campaignId="camp-1"
        sessionId="session-8"
        campaign={campaign}
        session={session}
        downloadFn={downloadFn}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Download PDF' }))

    expect(
      await screen.findByText(/session-8\.pdf downloaded/)
    ).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Synopsis/ })).toBeChecked()
  })

  it('offers a retry on failure while keeping the prior selection intact', async () => {
    const user = userEvent.setup()
    const downloadFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('render failed'))
      .mockResolvedValueOnce('session-8.pdf')
    renderExport(
      <SessionExportView
        campaignId="camp-1"
        sessionId="session-8"
        campaign={campaign}
        session={session}
        downloadFn={downloadFn}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Download PDF' }))

    expect(await screen.findByText(/failed to render/i)).toBeInTheDocument()
    // Selection survives the failure.
    expect(screen.getByRole('checkbox', { name: /Session goal/ })).toBeChecked()

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    await waitFor(() => expect(downloadFn).toHaveBeenCalledTimes(2))
  })

  it('replaces controls and preview with a missing/non-exportable state', () => {
    renderExport(
      <SessionExportView
        campaignId="camp-1"
        sessionId="session-8"
        campaign={campaign}
        session={nonExportableSession}
        downloadFn={vi.fn()}
      />
    )

    expect(screen.getByText('Nothing to export yet')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Download PDF' })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Back to editing/ })
    ).toBeInTheDocument()
  })

  it('applies the entrance motion class to the view root', () => {
    const { container } = renderExport(
      <SessionExportView
        campaignId="camp-1"
        sessionId="session-8"
        campaign={campaign}
        session={session}
        downloadFn={vi.fn()}
      />
    )

    expect(container.querySelector('.ll-view-enter')).not.toBeNull()
  })
})
