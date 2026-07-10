import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { render, screen, waitFor } from '@/tests/intl'
import { GeneratedSessionView } from '@/components/sessions/generated-session-view'

function withQueryClient({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  )
}

function renderGenerated(ui: React.ReactElement) {
  return render(ui, { wrapper: withQueryClient })
}

const session = {
  id: 'session-8',
  campaign_id: 'camp-1',
  session_number: 8,
  summary: 'Halia calls in the debt.',
  consequences: null,
  generated_content: {
    continuity_links: [{ memory_fact_id: 'mem-1', relevance: 'Halia split' }],
    sections: [
      {
        id: 'synopsis',
        label: 'Synopsis',
        body: 'Halia offers silence for a quiet job.',
        origin: 'scribe' as const,
      },
      {
        id: 'twist',
        label: 'Twist',
        body: 'Robert Herman is waiting.',
        origin: 'scribe' as const,
      },
    ],
  },
  trace_json: {},
  created_at: null,
  updated_at: null,
}

const campaign = { id: 'camp-1', title: 'Sombras sobre Phandalin' }
const memories = [
  {
    id: 'mem-1',
    campaign_id: 'camp-1',
    source_session_id: 'session-7',
    content: 'Two party members earned Halia favor and two damaged it.',
    type: 'relationship',
    importance: 'high' as const,
    status: 'active' as const,
    created_at: null,
    updated_at: null,
  },
  {
    id: 'mem-2',
    campaign_id: 'camp-1',
    source_session_id: 'session-6',
    content: 'A different accepted memory was active but not used here.',
    type: 'secret',
    importance: 'medium' as const,
    status: 'active' as const,
    created_at: null,
    updated_at: null,
  },
]

describe('GeneratedSessionView', () => {
  it('renders the handoff view with sections, actions, memories, legend, and private notes', () => {
    renderGenerated(
      <GeneratedSessionView
        campaignId="camp-1"
        sessionId="session-8"
        campaign={campaign}
        session={session}
        memories={memories}
      />
    )

    expect(screen.getByText('Session 8 · Proposal')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Halia calls in the debt.' })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Save changes' })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export PDF →' })).toBeDisabled()
    expect(
      screen.queryByRole('link', { name: 'Export PDF →' })
    ).not.toBeInTheDocument()
    expect(screen.getByText('Coming in Block 9.')).toBeInTheDocument()
    expect(screen.getByText('/01')).toBeInTheDocument()
    expect(screen.getAllByText('✦ Scribe').length).toBeGreaterThan(0)
    expect(screen.getByText('Memories woven in')).toBeInTheDocument()
    expect(
      screen.getByText(/Two party members earned Halia favor/)
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/A different accepted memory was active/)
    ).not.toBeInTheDocument()
    expect(screen.getByText('Private DM notes')).toBeInTheDocument()
  })

  it('shows an empty memories fallback when the generated session has no continuity links', () => {
    renderGenerated(
      <GeneratedSessionView
        campaignId="camp-1"
        sessionId="session-8"
        campaign={campaign}
        session={{
          ...session,
          generated_content: {
            ...session.generated_content,
            continuity_links: [],
          },
        }}
        memories={memories}
      />
    )

    expect(screen.getByText('Memories woven in')).toBeInTheDocument()
    expect(screen.getByText('No woven memories recorded.')).toBeInTheDocument()
    expect(
      screen.queryByText(/Two party members earned Halia favor/)
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/A different accepted memory was active/)
    ).not.toBeInTheDocument()
  })

  it('edits a section, saves it, and flips the origin badge', async () => {
    const update = vi
      .fn()
      .mockImplementation(async (_id, payload) => ({ ...session, ...payload }))
    renderGenerated(
      <GeneratedSessionView
        campaignId="camp-1"
        sessionId="session-8"
        campaign={campaign}
        session={session}
        memories={memories}
        updateSessionFn={update}
      />
    )

    await userEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    const editor = screen.getByLabelText('Synopsis')
    await userEvent.clear(editor)
    await userEvent.type(editor, 'Edited plan for Halia.')
    await userEvent.click(
      screen.getByRole('button', { name: 'Save section changes' })
    )

    await waitFor(() => expect(update).toHaveBeenCalled())
    expect(screen.getByText('Edited plan for Halia.')).toBeInTheDocument()
    expect(screen.getAllByText('✎ Edited by you').length).toBeGreaterThan(0)
    expect(screen.getByRole('status')).toHaveTextContent('Section saved')
  })

  it('preserves continuity links and unknown generated content fields when saving one section', async () => {
    const sessionWithExtra = {
      ...session,
      generated_content: {
        ...session.generated_content,
        private_seed: 'keep-me',
      },
    }
    const update = vi.fn().mockImplementation(async (_id, payload) => ({
      ...sessionWithExtra,
      ...payload,
    }))
    renderGenerated(
      <GeneratedSessionView
        campaignId="camp-1"
        sessionId="session-8"
        campaign={campaign}
        session={sessionWithExtra}
        memories={memories}
        updateSessionFn={update}
      />
    )

    await userEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    await userEvent.clear(screen.getByLabelText('Synopsis'))
    await userEvent.type(
      screen.getByLabelText('Synopsis'),
      'Edited with links.'
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Save section changes' })
    )

    await waitFor(() => expect(update).toHaveBeenCalled())
    expect(update).toHaveBeenCalledWith(
      'session-8',
      expect.objectContaining({
        generated_content: expect.objectContaining({
          continuity_links: [
            { memory_fact_id: 'mem-1', relevance: 'Halia split' },
          ],
          private_seed: 'keep-me',
        }),
      })
    )
  })

  it('preserves continuity links and unknown generated content fields when saving all sections', async () => {
    const sessionWithExtra = {
      ...session,
      generated_content: {
        ...session.generated_content,
        private_seed: 'keep-me',
      },
    }
    const update = vi.fn().mockImplementation(async (_id, payload) => ({
      ...sessionWithExtra,
      ...payload,
    }))
    renderGenerated(
      <GeneratedSessionView
        campaignId="camp-1"
        sessionId="session-8"
        campaign={campaign}
        session={sessionWithExtra}
        memories={memories}
        updateSessionFn={update}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(update).toHaveBeenCalled())
    expect(update).toHaveBeenCalledWith(
      'session-8',
      expect.objectContaining({
        generated_content: expect.objectContaining({
          continuity_links: [
            { memory_fact_id: 'mem-1', relevance: 'Halia split' },
          ],
          private_seed: 'keep-me',
        }),
      })
    )
  })

  it('localizes legacy memory type labels from persisted generated sessions', () => {
    render(
      <GeneratedSessionView
        campaignId="camp-1"
        sessionId="session-8"
        campaign={campaign}
        session={session}
        memories={[
          {
            ...memories[0],
            type: 'Faction Relationship',
          },
        ]}
      />,
      { wrapper: withQueryClient, locale: 'es' }
    )

    expect(screen.getByText('Relación')).toBeInTheDocument()
    expect(screen.queryByText('Faction Relationship')).not.toBeInTheDocument()
  })

  it('preserves edited text when PATCH fails', async () => {
    const update = vi.fn().mockRejectedValue(new Error('network'))
    renderGenerated(
      <GeneratedSessionView
        campaignId="camp-1"
        sessionId="session-8"
        campaign={campaign}
        session={session}
        memories={memories}
        updateSessionFn={update}
      />
    )

    await userEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    const editor = screen.getByLabelText('Synopsis')
    await userEvent.clear(editor)
    await userEvent.type(editor, 'Do not lose this text.')
    await userEvent.click(
      screen.getByRole('button', { name: 'Save section changes' })
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not save this section'
    )
    expect(screen.getByLabelText('Synopsis')).toHaveValue(
      'Do not lose this text.'
    )
  })

  it('cancels editing without calling PATCH', async () => {
    const update = vi.fn()
    renderGenerated(
      <GeneratedSessionView
        campaignId="camp-1"
        sessionId="session-8"
        campaign={campaign}
        session={session}
        memories={memories}
        updateSessionFn={update}
      />
    )

    await userEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    await userEvent.clear(screen.getByLabelText('Synopsis'))
    await userEvent.type(screen.getByLabelText('Synopsis'), 'Temporary')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(update).not.toHaveBeenCalled()
    expect(
      screen.getByText('Halia offers silence for a quiet job.')
    ).toBeInTheDocument()
  })

  it('copies all sections to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    renderGenerated(
      <GeneratedSessionView
        campaignId="camp-1"
        sessionId="session-8"
        campaign={campaign}
        session={session}
        memories={memories}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Copy' }))

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('SYNOPSIS\nHalia offers silence')
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      'Session copied to clipboard'
    )
  })
})
