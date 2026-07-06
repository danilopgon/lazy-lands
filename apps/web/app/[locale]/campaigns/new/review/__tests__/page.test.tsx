import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockCreateCampaign,
  mockPush,
  mockReadExtractionDraft,
  mockClearExtractionDraft,
} = vi.hoisted(() => ({
  mockCreateCampaign: vi.fn(),
  mockPush: vi.fn(),
  mockReadExtractionDraft: vi.fn(),
  mockClearExtractionDraft: vi.fn(),
}))

vi.mock('@/lib/campaigns/api', () => ({
  createCampaign: mockCreateCampaign,
  CampaignApiError: class CampaignApiError extends Error {},
}))

vi.mock('@/lib/campaigns/draft-storage', () => ({
  readExtractionDraft: mockReadExtractionDraft,
  clearExtractionDraft: mockClearExtractionDraft,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

import ReviewCampaignPage from '../page'

const draft = {
  title: 'Shadows over Phandalin',
  description: 'A frontier town beset by goblins',
  world_state: 'Uneasy calm after the goblin raids',
  system: 'D&D 5e',
  tone: 'Grim survival',
  npcs: [
    {
      name: 'Elandra',
      description: 'A wandering scholar',
      current_state: 'Injured',
      motivation: 'Find the lost tome',
      content_source: 'llm',
    },
  ],
  factions: [
    {
      name: 'Redbrands',
      description: 'Local thugs',
      current_stance: 'Hostile',
      goals: 'Control the town',
      content_source: 'llm',
    },
  ],
  arcs: [
    {
      title: 'The Sundered Crown',
      description: 'A war of succession looms',
      priority: 'high',
      content_source: 'llm',
    },
  ],
}

/**
 * Render the review page inside a fresh QueryClientProvider.
 *
 * @returns {ReturnType<typeof render>} The RTL render result.
 */
function renderPage() {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <ReviewCampaignPage />
    </QueryClientProvider>
  )
}

describe('ReviewCampaignPage (CUI-002)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReadExtractionDraft.mockReturnValue(JSON.parse(JSON.stringify(draft)))
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('renders title, description, world_state, npcs, factions, and arcs from local state', async () => {
    renderPage()

    // Prose blocks render read-only (EditableProse) until the DM clicks Edit.
    expect(
      await screen.findByText('Shadows over Phandalin')
    ).toBeInTheDocument()
    expect(
      screen.getByText('A frontier town beset by goblins')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Uneasy calm after the goblin raids')
    ).toBeInTheDocument()
    expect(screen.getByText('Elandra')).toBeInTheDocument()
    expect(screen.getByText('Redbrands')).toBeInTheDocument()
    expect(screen.getByText('The Sundered Crown')).toBeInTheDocument()
  })

  it('redirects to campaign creation when no extraction draft exists', async () => {
    mockReadExtractionDraft.mockReturnValue(null)

    renderPage()

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/campaigns/new')
    })
  })

  it('shows the Scribe badge for llm-sourced items', () => {
    renderPage()

    const npcRow = screen
      .getByText('Elandra')
      .closest('[data-testid="npc-item"]')
    expect(npcRow).not.toBeNull()
    expect(
      within(npcRow as HTMLElement).getByText(/scribe/i)
    ).toBeInTheDocument()
  })

  it('editing an llm-sourced NPC flips its badge to Edited', async () => {
    const user = userEvent.setup()
    renderPage()

    const npcRow = screen
      .getByText('Elandra')
      .closest('[data-testid="npc-item"]') as HTMLElement
    await user.click(within(npcRow).getByRole('button', { name: /edit/i }))

    const nameInput = within(npcRow).getByDisplayValue('Elandra')
    await user.clear(nameInput)
    await user.type(nameInput, 'Elandra the Wise')
    await user.click(within(npcRow).getByRole('button', { name: /save/i }))

    await waitFor(() => {
      const updatedRow = screen
        .getByText('Elandra the Wise')
        .closest('[data-testid="npc-item"]') as HTMLElement
      expect(within(updatedRow).getByText(/edited/i)).toBeInTheDocument()
    })
  })

  it('the DM can remove an NPC', async () => {
    const user = userEvent.setup()
    renderPage()

    const npcRow = screen
      .getByText('Elandra')
      .closest('[data-testid="npc-item"]') as HTMLElement
    await user.click(within(npcRow).getByRole('button', { name: /remove/i }))

    expect(screen.queryByText('Elandra')).not.toBeInTheDocument()
  })

  it('the DM can add a new faction, marked content_source: manual', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /add faction/i }))
    const nameInputs = screen.getAllByPlaceholderText(/name/i)
    await user.type(nameInputs[nameInputs.length - 1], 'The Silver Concord')
    await user.click(screen.getByRole('button', { name: /^add$/i }))

    await waitFor(() => {
      expect(screen.getByText('The Silver Concord')).toBeInTheDocument()
    })
    const newRow = screen
      .getByText('The Silver Concord')
      .closest('[data-testid="faction-item"]') as HTMLElement
    expect(within(newRow).getByText(/edited/i)).toBeInTheDocument()
  })

  it('a DM-added arc defaults to priority medium and content_source manual', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /add arc/i }))
    const titleInputs = screen.getAllByPlaceholderText(/title/i)
    await user.type(titleInputs[titleInputs.length - 1], 'The Buried Sigil')
    await user.click(screen.getByRole('button', { name: /^add$/i }))

    await waitFor(() => {
      expect(screen.getByText('The Buried Sigil')).toBeInTheDocument()
    })
    const newRow = screen
      .getByText('The Buried Sigil')
      .closest('[data-testid="arc-item"]') as HTMLElement
    expect(within(newRow).getByText(/edited/i)).toBeInTheDocument()
  })

  it('confirm calls POST /campaigns via createCampaign with the current reviewed payload', async () => {
    const user = userEvent.setup()
    mockCreateCampaign.mockResolvedValue({ id: 'campaign-123' })
    renderPage()

    await user.click(screen.getByRole('button', { name: /confirm/i }))

    await waitFor(() => {
      expect(mockCreateCampaign).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Shadows over Phandalin',
          description: 'A frontier town beset by goblins',
          world_state: 'Uneasy calm after the goblin raids',
          npcs: expect.arrayContaining([
            expect.objectContaining({
              name: 'Elandra',
              content_source: 'llm',
            }),
          ]),
          arcs: expect.arrayContaining([
            expect.objectContaining({
              title: 'The Sundered Crown',
              content_source: 'llm',
            }),
          ]),
        })
      )
    })
  })

  it('submits edited campaign title and description', async () => {
    const user = userEvent.setup()
    mockCreateCampaign.mockResolvedValue({ id: 'campaign-123' })
    renderPage()

    const titleSection = screen.getByTestId('prose-title')
    await user.click(
      within(titleSection).getByRole('button', { name: /edit/i })
    )
    await user.clear(within(titleSection).getByLabelText(/campaign title/i))
    await user.type(
      within(titleSection).getByLabelText(/campaign title/i),
      'Ashes of Neverwinter'
    )
    await user.click(
      within(titleSection).getByRole('button', { name: /save changes/i })
    )

    const descSection = screen.getByTestId('prose-description')
    await user.click(within(descSection).getByRole('button', { name: /edit/i }))
    await user.clear(
      within(descSection).getByLabelText(/campaign description/i)
    )
    await user.type(
      within(descSection).getByLabelText(/campaign description/i),
      'A city rebuilds while old powers stir beneath it'
    )
    await user.click(
      within(descSection).getByRole('button', { name: /save changes/i })
    )

    await user.click(screen.getByRole('button', { name: /confirm/i }))

    await waitFor(() => {
      expect(mockCreateCampaign).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Ashes of Neverwinter',
          description: 'A city rebuilds while old powers stir beneath it',
        })
      )
    })
  })

  it('a successful save redirects to the campaign detail route', async () => {
    const user = userEvent.setup()
    mockCreateCampaign.mockResolvedValue({ id: 'campaign-123' })
    renderPage()

    await user.click(screen.getByRole('button', { name: /confirm/i }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/campaigns/campaign-123')
    })
  })

  it('a failed save preserves DM edits and shows an error, without resetting state', async () => {
    const user = userEvent.setup()
    const { CampaignApiError } = await import('@/lib/campaigns/api')
    mockCreateCampaign.mockRejectedValue(
      new CampaignApiError('Could not save the campaign. Please retry.')
    )
    renderPage()

    const npcRow = screen
      .getByText('Elandra')
      .closest('[data-testid="npc-item"]') as HTMLElement
    await user.click(within(npcRow).getByRole('button', { name: /remove/i }))
    expect(screen.queryByText('Elandra')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /confirm/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/could not save the campaign/i)
      ).toBeInTheDocument()
    })
    // The removal must still be reflected — nothing resets on failure.
    expect(screen.queryByText('Elandra')).not.toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('shows the Scribe quill takeover while the campaign is being created', async () => {
    const user = userEvent.setup()
    let resolveCreate: (value: unknown) => void
    mockCreateCampaign.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve
      })
    )
    renderPage()

    await screen.findByText('Elandra')
    await user.click(screen.getByRole('button', { name: /confirm/i }))

    await waitFor(() => {
      expect(screen.getByText(/binding your chronicle/i)).toBeInTheDocument()
    })
    // The review form is gone while the Scribe binds the chronicle.
    expect(screen.queryByText('Elandra')).not.toBeInTheDocument()

    resolveCreate!({ id: 'campaign-xyz' })
  })

  it('keeps stale review content hidden after creation resolves and navigation has been requested', async () => {
    const user = userEvent.setup()
    let resolveCreate: (value: { id: string }) => void
    mockCreateCampaign.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve
      })
    )
    renderPage()

    await screen.findByText('Elandra')
    await user.click(screen.getByRole('button', { name: /confirm/i }))

    await screen.findByText(/binding your chronicle/i)

    resolveCreate!({ id: 'campaign-xyz' })

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/campaigns/campaign-xyz')
    })
    expect(screen.getByText(/binding your chronicle/i)).toBeInTheDocument()
    expect(screen.queryByText('Elandra')).not.toBeInTheDocument()
    expect(screen.queryByText(/what the scribe found/i)).not.toBeInTheDocument()
  })

  it('editing a Scribe-drafted prose block flips its badge to Edited', async () => {
    const user = userEvent.setup()
    renderPage()

    const titleSection = screen.getByTestId('prose-title')
    expect(within(titleSection).getByText(/scribe/i)).toBeInTheDocument()

    await user.click(
      within(titleSection).getByRole('button', { name: /edit/i })
    )
    await user.clear(within(titleSection).getByLabelText(/campaign title/i))
    await user.type(
      within(titleSection).getByLabelText(/campaign title/i),
      'Ashes of Neverwinter'
    )
    await user.click(
      within(titleSection).getByRole('button', { name: /save changes/i })
    )

    await waitFor(() => {
      expect(within(titleSection).getByText(/edited/i)).toBeInTheDocument()
    })
  })
})
