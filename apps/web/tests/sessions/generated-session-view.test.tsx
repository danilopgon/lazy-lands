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
    // H1 must derive from generated_content.title or the localized proposal
    // fallback, never from the session synopsis/summary body.
    expect(
      screen.getByRole('heading', { name: 'Session 8 proposal' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Halia calls in the debt.' })
    ).not.toBeInTheDocument()
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

  it('uses a generated_content.title when present instead of the synopsis summary', () => {
    renderGenerated(
      <GeneratedSessionView
        campaignId="camp-1"
        sessionId="session-8"
        campaign={campaign}
        session={{
          ...session,
          generated_content: {
            ...session.generated_content!,
            title: 'The Quiet Ledger',
          },
        }}
        memories={memories}
      />
    )

    expect(
      screen.getByRole('heading', { name: 'The Quiet Ledger' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Session 8 proposal' })
    ).not.toBeInTheDocument()
    // Synopsis body must never leak into the H1 even when an explicit title is set.
    expect(
      screen.queryByRole('heading', {
        name: 'Halia offers silence for a quiet job.',
      })
    ).not.toBeInTheDocument()
  })

  it('localizes canonical section labels in the Spanish UI without mutating PATCH payloads', async () => {
    const update = vi
      .fn()
      .mockImplementation(async (_id, payload) => ({ ...session, ...payload }))
    render(
      <GeneratedSessionView
        campaignId="camp-1"
        sessionId="session-8"
        campaign={campaign}
        session={{
          ...session,
          generated_content: {
            ...session.generated_content!,
            continuity_links: [],
            sections: [
              {
                id: 'synopsis',
                label: 'Synopsis',
                body: 'Halia offers silence for a quiet job.',
                origin: 'scribe' as const,
              },
              {
                id: 'main_objective',
                label: 'Main objective',
                body: 'Negotiate quietly.',
                origin: 'scribe' as const,
              },
              {
                id: 'faction_reactions',
                label: 'Faction reactions',
                body: 'The guild watches.',
                origin: 'scribe' as const,
              },
              {
                id: 'arc_progression',
                label: 'Arc progression',
                body: 'Herman leans in.',
                origin: 'scribe' as const,
              },
            ],
          },
        }}
        memories={memories}
        updateSessionFn={update}
      />,
      { wrapper: withQueryClient, locale: 'es' }
    )

    expect(
      screen.getByRole('heading', { name: 'Sinopsis' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Objetivo principal' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Reacciones de facciones' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Avance de arco' })
    ).toBeInTheDocument()
    // Raw English labels from the backend payload must not surface in the Spanish UI.
    expect(screen.queryByText('Main objective')).not.toBeInTheDocument()
    expect(screen.queryByText('Faction reactions')).not.toBeInTheDocument()

    await userEvent.click(screen.getAllByRole('button', { name: 'Editar' })[1])
    await userEvent.clear(screen.getByLabelText('Objetivo principal'))
    await userEvent.type(
      screen.getByLabelText('Objetivo principal'),
      'Negotiate in whispers.'
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar cambios de sección' })
    )

    await waitFor(() => expect(update).toHaveBeenCalled())
    // The persisted section keeps the backend-provided canonical `label`, not the localized display copy.
    expect(update).toHaveBeenCalledWith(
      'session-8',
      expect.objectContaining({
        generated_content: expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({
              id: 'main_objective',
              label: 'Main objective',
            }),
          ]),
        }),
      })
    )
  })

  it('does not render raw UUIDs under woven memories in the sidebar', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    renderGenerated(
      <GeneratedSessionView
        campaignId="camp-1"
        sessionId="session-8"
        campaign={campaign}
        session={session}
        memories={[
          {
            ...memories[0],
            source_session_id: uuid,
          },
        ]}
      />
    )

    expect(
      screen.getByText(/Two party members earned Halia favor/)
    ).toBeInTheDocument()
    expect(screen.queryByText(uuid)).not.toBeInTheDocument()
    // The localized manual source fallback must not render either when a linked session id exists.
    expect(screen.queryByText('Manual note')).not.toBeInTheDocument()
  })

  it('shows a human-readable source session when the source id carries a session number', () => {
    renderGenerated(
      <GeneratedSessionView
        campaignId="camp-1"
        sessionId="session-8"
        campaign={campaign}
        session={session}
        memories={memories}
      />
    )

    expect(screen.getByText('Session 7')).toBeInTheDocument()
    expect(screen.queryByText('session-7')).not.toBeInTheDocument()
  })

  it('omits memory source text when no human-readable source is available', () => {
    renderGenerated(
      <GeneratedSessionView
        campaignId="camp-1"
        sessionId="session-8"
        campaign={campaign}
        session={session}
        memories={[{ ...memories[0], source_session_id: null }]}
      />
    )

    expect(screen.queryByText('Manual note')).not.toBeInTheDocument()
  })

  it('hides the prototype regeneration placeholder and shows a disabled coming-later affordance', () => {
    renderGenerated(
      <GeneratedSessionView
        campaignId="camp-1"
        sessionId="session-8"
        campaign={campaign}
        session={session}
        memories={memories}
      />
    )

    expect(
      screen.queryByRole('button', { name: /Regenerate/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/Alternativa regenerada/i)
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/Regenerated alternative/i)
    ).not.toBeInTheDocument()
    // The disabled affordance must be present so the DM sees this is deferred, not broken.
    const comingLater = screen.getByRole('button', { name: /Coming later/i })
    expect(comingLater).toBeDisabled()
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

  it('does not send stale initial summary when saving a non-synopsis section after synopsis was saved', async () => {
    const update = vi
      .fn()
      .mockImplementationOnce(async (_id, payload) => ({
        ...session,
        ...payload,
        summary: 'Fresh synopsis summary.',
      }))
      .mockImplementationOnce(async (_id, payload) => ({
        ...session,
        ...payload,
        summary: 'Fresh synopsis summary.',
      }))
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
    await userEvent.type(
      screen.getByLabelText('Synopsis'),
      'Fresh synopsis summary.'
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Save section changes' })
    )
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1))

    await userEvent.click(screen.getAllByRole('button', { name: 'Edit' })[1])
    await userEvent.clear(screen.getByLabelText('Twist'))
    await userEvent.type(screen.getByLabelText('Twist'), 'A later twist.')
    await userEvent.click(
      screen.getByRole('button', { name: 'Save section changes' })
    )

    await waitFor(() => expect(update).toHaveBeenCalledTimes(2))
    expect(update.mock.calls[0][1]).toEqual(
      expect.objectContaining({ summary: 'Fresh synopsis summary.' })
    )
    expect(update.mock.calls[1][1]).not.toHaveProperty('summary')
  })

  it('includes the open editor draft when saving all changes', async () => {
    const update = vi.fn().mockImplementation(async (_id, payload) => ({
      ...session,
      ...payload,
    }))
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

    await userEvent.click(screen.getAllByRole('button', { name: 'Edit' })[1])
    await userEvent.clear(screen.getByLabelText('Twist'))
    await userEvent.type(
      screen.getByLabelText('Twist'),
      'Draft twist before header save.'
    )
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(update).toHaveBeenCalled())
    expect(update).toHaveBeenCalledWith(
      'session-8',
      expect.objectContaining({
        generated_content: expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({
              id: 'twist',
              body: 'Draft twist before header save.',
              origin: 'edited',
            }),
          ]),
        }),
      })
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
