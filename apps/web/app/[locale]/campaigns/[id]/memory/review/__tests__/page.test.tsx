import { render, screen, waitFor, within } from '@/tests/intl'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NextIntlClientProvider } from 'next-intl'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import en from '@/messages/en.json'
import es from '@/messages/es.json'
import {
  CARD_EXIT_MS,
  STAMP_LIFETIME_MS,
  STAMP_POP_MS,
} from '@/lib/motion/timings'

/** Generous ceiling for waiting out a full stamp → hold → exit lifetime. */
const LIFETIME_TIMEOUT_MS = STAMP_LIFETIME_MS + CARD_EXIT_MS + 1500

const {
  mockGetCampaignDetail,
  mockGetMemoryFacts,
  mockCreateMemoryFact,
  mockUpdateMemoryFact,
  mockReadMemoryReviewDraft,
  mockCompleteMemoryReviewDraft,
  mockRewriteMemoryReviewDraftSuggestions,
  mockWriteMemoryReviewDraft,
  mockRecoverMemorySuggestions,
  mockPush,
  searchParams,
} = vi.hoisted(() => ({
  mockGetCampaignDetail: vi.fn(),
  mockGetMemoryFacts: vi.fn(),
  mockCreateMemoryFact: vi.fn(),
  mockUpdateMemoryFact: vi.fn(),
  mockReadMemoryReviewDraft: vi.fn(),
  mockCompleteMemoryReviewDraft: vi.fn(),
  mockRewriteMemoryReviewDraftSuggestions: vi.fn(),
  mockWriteMemoryReviewDraft: vi.fn(),
  mockRecoverMemorySuggestions: vi.fn(),
  mockPush: vi.fn(),
  // Mutable so a test can drop `?session=` and assert the not-eligible state.
  searchParams: { value: 'session=sess-1' },
}))

vi.mock('@/lib/campaigns/api', () => ({
  getCampaignDetail: mockGetCampaignDetail,
  CampaignApiError: class CampaignApiError extends Error {},
  CampaignNotFoundError: class CampaignNotFoundError extends Error {},
}))

vi.mock('@/lib/memory/api', () => ({
  getMemoryFacts: mockGetMemoryFacts,
  createMemoryFact: mockCreateMemoryFact,
  updateMemoryFact: mockUpdateMemoryFact,
  MemoryApiError: class MemoryApiError extends Error {},
  MemoryCampaignNotFoundError: class MemoryCampaignNotFoundError extends Error {},
}))

vi.mock('@/lib/sessions/memory-review-draft', () => ({
  readMemoryReviewDraft: mockReadMemoryReviewDraft,
  completeMemoryReviewDraft: mockCompleteMemoryReviewDraft,
  rewriteMemoryReviewDraftSuggestions: mockRewriteMemoryReviewDraftSuggestions,
  writeMemoryReviewDraft: mockWriteMemoryReviewDraft,
}))

vi.mock('@/lib/sessions/api', () => ({
  recoverMemorySuggestions: mockRecoverMemorySuggestions,
  SessionApiError: class SessionApiError extends Error {},
  SessionCampaignNotFoundError: class SessionCampaignNotFoundError extends Error {},
  SessionRateLimitError: class SessionRateLimitError extends Error {},
  SessionNotPlayedError: class SessionNotPlayedError extends Error {},
  SessionValidationError: class SessionValidationError extends Error {},
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'camp-1' }),
  useSearchParams: () => new URLSearchParams(searchParams.value),
}))

vi.mock('@/i18n/navigation', async () => {
  const { createElement } = await import('react')
  return {
    useRouter: () => ({ push: mockPush }),
    usePathname: () => '/campaigns/camp-1/memory/review',
    Link: ({
      href,
      children,
      ...props
    }: {
      href: string
      children?: React.ReactNode
    }) => createElement('a', { href, ...props }, children),
  }
})

import MemoryReviewPage from '../page'

function buildCampaignDetail() {
  return {
    id: 'camp-1',
    title: 'Shadows over Phandalin',
    description: null,
    world_state: null,
    system: 'D&D 5e',
    tone: 'Intrigue',
    updated_at: '2026-07-09T00:00:00Z',
    npcs: [],
    factions: [],
    arcs: [],
  }
}

const draft = {
  version: 1,
  campaign_id: 'camp-1',
  session_id: 'sess-1',
  session_number: 7,
  memory_suggestions: [
    {
      content: 'Captain Vess owes the party a favor.',
      type: 'relationship',
      importance: 'high',
      reason: 'The favor changes future negotiations.',
      related: ['Captain Vess'],
    },
  ],
}

const twoSuggestionDraft = {
  ...draft,
  memory_suggestions: [
    draft.memory_suggestions[0],
    {
      content: 'The warehouse fire exposed guild ledgers.',
      type: 'consequence',
      importance: 'medium',
      reason: 'Future faction pressure depends on this evidence.',
      related: ['Black Bear Guild'],
    },
  ],
}

const activeMemory = {
  id: 'memory-1',
  campaign_id: 'camp-1',
  source_session_id: 'sess-1',
  content: 'The guild remembers the arson.',
  type: 'consequence',
  importance: 'medium',
  status: 'active',
  created_at: '2026-07-09T00:00:00Z',
  updated_at: '2026-07-09T00:00:00Z',
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryReviewPage />
    </QueryClientProvider>
  )
}

function renderPageEs() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <QueryClientProvider client={queryClient}>
        <MemoryReviewPage />
      </QueryClientProvider>
    </NextIntlClientProvider>
  )
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })

  return { promise, resolve }
}

describe('MemoryReviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    searchParams.value = 'session=sess-1'
    mockGetCampaignDetail.mockResolvedValue(buildCampaignDetail())
    mockGetMemoryFacts.mockResolvedValue([activeMemory])
    mockReadMemoryReviewDraft.mockReturnValue(draft)
  })

  it('renders loading while campaign and active memories load', () => {
    mockGetCampaignDetail.mockReturnValue(new Promise(() => {}))

    renderPage()

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText(/opening the margins/i)).toBeInTheDocument()
  })

  it('keeps pending review controls available while active memories are loading', async () => {
    const memories = deferred<(typeof activeMemory)[]>()
    mockGetMemoryFacts.mockReturnValue(memories.promise)

    renderPage()

    expect(
      await screen.findByRole('button', { name: /accept as memory/i })
    ).toBeEnabled()
    expect(screen.getByText(/loading active memories/i)).toBeInTheDocument()
  })

  it('renders campaign error and not-found notices with retry actions', async () => {
    const { CampaignNotFoundError } = await import('@/lib/campaigns/api')
    mockGetCampaignDetail.mockRejectedValueOnce(new Error('network'))

    const first = renderPage()

    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeEnabled()
    first.unmount()

    mockGetCampaignDetail.mockRejectedValueOnce(
      new CampaignNotFoundError('Campaign camp-1 not found')
    )
    renderPage()

    expect(await screen.findByText(/campaign not found/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeEnabled()
  })

  it('renders retryable backend error when active memories fail', async () => {
    mockGetMemoryFacts.mockRejectedValue(new Error('network'))

    renderPage()

    await waitFor(() => {
      expect(
        screen.getByText(/could not load active memories/i)
      ).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('renders pending suggestions and active memories from live data', async () => {
    renderPage()

    await screen.findByRole('heading', { name: /the scribe's margins/i })
    expect(screen.getByText(/session 7 · memory review/i)).toBeInTheDocument()
    expect(screen.getByText(/1 suggestion/i)).toBeInTheDocument()
    expect(screen.getByText(/captain vess owes/i)).toBeInTheDocument()
    expect(screen.getByText(/the favor changes future/i)).toBeInTheDocument()
    expect(screen.getByText(/the guild remembers/i)).toBeInTheDocument()
    expect(screen.getByText(/accepted · session 7/i)).toBeInTheDocument()
  })

  it('localizes the importance value and type chip in Spanish', async () => {
    renderPageEs()

    await screen.findByText(/Los márgenes del Escriba/i)
    // importance value is translated, not the raw enum token "high"
    expect(screen.getByText(/Importancia · Alta/i)).toBeInTheDocument()
    // type chip is translated for enum value "relationship"
    expect(screen.getByText('Relación')).toBeInTheDocument()
    expect(screen.queryByText(/relationship/i)).not.toBeInTheDocument()
  })

  it('shows direct-link empty pending and empty active states', async () => {
    mockReadMemoryReviewDraft.mockReturnValue(null)
    mockGetMemoryFacts.mockResolvedValue([])

    renderPage()

    await screen.findByText(/the margins are clean/i)
    expect(screen.getByText(/no suggestions await review/i)).toBeInTheDocument()
    expect(screen.getByText(/no memories yet/i)).toBeInTheDocument()
  })

  it('does not read the storage draft during initial render', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    renderToString(
      <NextIntlClientProvider locale="en" messages={en}>
        <QueryClientProvider client={queryClient}>
          <MemoryReviewPage />
        </QueryClientProvider>
      </NextIntlClientProvider>
    )

    expect(mockReadMemoryReviewDraft).not.toHaveBeenCalled()
  })

  it('rewrites the draft after accepting one of multiple suggestions', async () => {
    const user = userEvent.setup()
    mockReadMemoryReviewDraft.mockReturnValue(twoSuggestionDraft)
    mockCreateMemoryFact.mockResolvedValue({ ...activeMemory, id: 'memory-2' })

    renderPage()

    await screen.findByText(/2 suggestions await/i)
    await user.click(
      screen.getAllByRole('button', { name: /accept as memory/i })[0]
    )

    await waitFor(
      () => {
        expect(mockRewriteMemoryReviewDraftSuggestions).toHaveBeenCalledWith(
          'camp-1',
          'sess-1',
          [
            {
              content: 'The warehouse fire exposed guild ledgers.',
              type: 'consequence',
              importance: 'medium',
              reason: 'Future faction pressure depends on this evidence.',
              related: ['Black Bear Guild'],
            },
          ]
        )
      },
      { timeout: LIFETIME_TIMEOUT_MS }
    )
    expect(mockCompleteMemoryReviewDraft).not.toHaveBeenCalled()
  })

  it('drops an accepted suggestion from the draft even if the DM leaves mid-stamp', async () => {
    const user = userEvent.setup()
    mockReadMemoryReviewDraft.mockReturnValue(twoSuggestionDraft)
    mockCreateMemoryFact.mockResolvedValue({ ...activeMemory, id: 'memory-2' })

    const { unmount } = renderPage()

    await screen.findByText(/2 suggestions await/i)
    await user.click(
      screen.getAllByRole('button', { name: /accept as memory/i })[0]
    )
    await screen.findByText(/★ accepted/i)

    // The stamp now holds for over a second. Leaving during that hold must not
    // resurrect an already-accepted suggestion on the DM's next visit.
    unmount()

    await waitFor(
      () => {
        expect(mockRewriteMemoryReviewDraftSuggestions).toHaveBeenCalledWith(
          'camp-1',
          'sess-1',
          [
            {
              content: 'The warehouse fire exposed guild ledgers.',
              type: 'consequence',
              importance: 'medium',
              reason: 'Future faction pressure depends on this evidence.',
              related: ['Black Bear Guild'],
            },
          ]
        )
      },
      { timeout: LIFETIME_TIMEOUT_MS }
    )
  })

  it('shows the loading takeover instead of the empty state until the draft read completes', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    // The DM arrives here from `/sessions/new`, which already primed this exact
    // query key — so `campaignQuery.isLoading` is false on the first paint and
    // only the draft gate can keep the empty state off the screen.
    queryClient.setQueryData(['campaign', 'camp-1'], buildCampaignDetail())
    queryClient.setQueryData(
      ['campaign', 'camp-1', 'memory-facts', 'active'],
      [activeMemory]
    )

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryReviewPage />
      </QueryClientProvider>
    )

    expect(screen.getByText(/opening the margins/i)).toBeInTheDocument()
    expect(screen.queryByText(/the margins are clean/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/nothing awaits review/i)).not.toBeInTheDocument()

    expect(await screen.findByText(/captain vess owes/i)).toBeInTheDocument()
    expect(mockCompleteMemoryReviewDraft).not.toHaveBeenCalled()
  })

  it('keeps the accepted card and its stamp readable before the card leaves', async () => {
    const user = userEvent.setup()
    mockCreateMemoryFact.mockResolvedValue({ ...activeMemory, id: 'memory-2' })

    const { container } = renderPage()

    await user.click(
      await screen.findByRole('button', { name: /accept as memory/i })
    )

    expect(await screen.findByText(/★ accepted/i)).toBeInTheDocument()

    // The stamp pop keyframe must be allowed to finish; the card used to be
    // destroyed at 120ms, well before the 260ms pop reached full opacity.
    await new Promise((resolve) => setTimeout(resolve, STAMP_POP_MS + 40))
    expect(screen.getByText(/captain vess owes/i)).toBeInTheDocument()
    expect(container.querySelector('.ll-stamp')).not.toBeNull()

    // Then the exit animation plays before the card is torn down.
    await waitFor(
      () => {
        expect(container.querySelector('.ll-accepting')).not.toBeNull()
      },
      { timeout: LIFETIME_TIMEOUT_MS }
    )
    await waitFor(
      () => {
        expect(screen.queryByText(/captain vess owes/i)).not.toBeInTheDocument()
      },
      { timeout: LIFETIME_TIMEOUT_MS }
    )
  })

  it('scopes the busy indicator to the card being accepted', async () => {
    const user = userEvent.setup()
    mockReadMemoryReviewDraft.mockReturnValue(twoSuggestionDraft)
    const create = deferred<typeof activeMemory>()
    mockCreateMemoryFact.mockReturnValue(create.promise)

    renderPage()

    await screen.findByText(/2 suggestions await/i)
    const cards = screen.getAllByRole('article')
    await user.click(
      within(cards[0]).getByRole('button', { name: /accept as memory/i })
    )

    await waitFor(() => {
      expect(within(cards[0]).getByRole('status')).toHaveTextContent(
        /stamping/i
      )
    })
    expect(
      within(cards[0]).getByRole('button', { name: /accept as memory/i })
    ).toBeDisabled()

    // An unrelated accept must never freeze the rest of the margins.
    expect(within(cards[1]).queryByRole('status')).not.toBeInTheDocument()
    expect(
      within(cards[1]).getByRole('button', { name: /accept as memory/i })
    ).toBeEnabled()
    expect(
      within(cards[1]).getByRole('button', { name: /edit & accept/i })
    ).toBeEnabled()
    expect(
      within(cards[1]).getByRole('button', { name: /^dismiss$/i })
    ).toBeEnabled()

    create.resolve({ ...activeMemory, id: 'memory-2' })
    await waitFor(
      () => {
        expect(screen.getAllByRole('article')).toHaveLength(1)
      },
      { timeout: LIFETIME_TIMEOUT_MS }
    )
  })

  it('keeps a card disabled while its own accept is in flight after a sibling accept starts', async () => {
    const user = userEvent.setup()
    mockReadMemoryReviewDraft.mockReturnValue(twoSuggestionDraft)
    const create = deferred<typeof activeMemory>()
    mockCreateMemoryFact.mockReturnValue(create.promise)

    renderPage()

    await screen.findByText(/2 suggestions await/i)
    const cards = screen.getAllByRole('article')

    await user.click(
      within(cards[0]).getByRole('button', { name: /accept as memory/i })
    )
    await waitFor(() => {
      expect(within(cards[0]).getByRole('status')).toHaveTextContent(
        /stamping/i
      )
    })

    // Per-card busy state means the DM can start a second accept before the
    // first resolves. That must never re-enable the first card's controls —
    // a re-click would fire a duplicate createMemoryFact for the same
    // suggestion and stamp the same memory twice.
    await user.click(
      within(cards[1]).getByRole('button', { name: /accept as memory/i })
    )
    await waitFor(() => {
      expect(within(cards[1]).getByRole('status')).toHaveTextContent(
        /stamping/i
      )
    })

    expect(
      within(cards[0]).getByRole('button', { name: /accept as memory/i })
    ).toBeDisabled()
    expect(
      within(cards[0]).getByRole('button', { name: /edit & accept/i })
    ).toBeDisabled()
    expect(within(cards[0]).getByRole('status')).toHaveTextContent(/stamping/i)
    expect(mockCreateMemoryFact).toHaveBeenCalledTimes(2)
  })

  it('accepts, edits, dismisses, and retires with busy-safe calls', async () => {
    const user = userEvent.setup()
    mockCreateMemoryFact.mockResolvedValue({ ...activeMemory, id: 'memory-2' })
    mockUpdateMemoryFact.mockResolvedValue({
      ...activeMemory,
      status: 'archived',
    })

    renderPage()

    await user.click(
      await screen.findByRole('button', { name: /edit & accept/i })
    )
    await user.clear(screen.getByRole('textbox', { name: /memory text/i }))
    await user.type(
      screen.getByRole('textbox', { name: /memory text/i }),
      'Captain Vess now owes the wizard a private favor.'
    )
    await user.click(
      screen.getByRole('button', { name: /save & accept as memory/i })
    )

    await waitFor(() => {
      expect(mockCreateMemoryFact).toHaveBeenCalledWith('camp-1', {
        source_session_id: 'sess-1',
        content: 'Captain Vess now owes the wizard a private favor.',
        type: 'relationship',
        importance: 'high',
      })
    })
    expect(screen.getByText(/edited & stamped/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /retire/i }))
    await waitFor(() => {
      expect(mockUpdateMemoryFact).toHaveBeenCalledWith('memory-1', {
        status: 'archived',
      })
    })
  })

  it('keeps pending controls before active-canon controls at 900px keyboard order', async () => {
    const user = userEvent.setup()
    const initialWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 900,
    })

    try {
      renderPage()

      const accept = await screen.findByRole('button', {
        name: /accept as memory/i,
      })
      const edit = screen.getByRole('button', { name: /edit & accept/i })
      const dismiss = screen.getByRole('button', { name: /^dismiss$/i })
      const retire = screen.getByRole('button', { name: /retire/i })

      expect(
        accept.compareDocumentPosition(retire) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy()
      accept.focus()
      await user.tab()
      expect(edit).toHaveFocus()
      await user.tab()
      expect(dismiss).toHaveFocus()
      await user.tab()
      expect(retire).toHaveFocus()
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: initialWidth,
      })
    }
  })

  it('keeps a failed accept retryable and shows feedback', async () => {
    const user = userEvent.setup()
    mockCreateMemoryFact.mockRejectedValue(new Error('network'))

    renderPage()

    await user.click(
      await screen.findByRole('button', { name: /accept as memory/i })
    )

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/could not stamp/i)
    })
    expect(screen.getByText(/captain vess owes/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /accept as memory/i })
    ).toBeEnabled()
  })

  it('keeps a failed retire retryable and shows feedback', async () => {
    const user = userEvent.setup()
    mockUpdateMemoryFact.mockRejectedValue(new Error('network'))

    renderPage()

    await user.click(await screen.findByRole('button', { name: /retire/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/could not retire/i)
    })
    expect(screen.getByText(/the guild remembers/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retire/i })).toBeEnabled()
  })

  it('dismisses a suggestion without creating a memory fact', async () => {
    const user = userEvent.setup()

    renderPage()

    await user.click(await screen.findByRole('button', { name: /dismiss/i }))

    await waitFor(() => {
      expect(screen.getByText(/struck out/i)).toBeInTheDocument()
    })
    expect(mockCreateMemoryFact).not.toHaveBeenCalled()
  })

  it('exercises edit-and-accept, dismiss, and retire through Spanish controls', async () => {
    const user = userEvent.setup()
    mockReadMemoryReviewDraft.mockReturnValue(twoSuggestionDraft)
    mockCreateMemoryFact.mockResolvedValue({ ...activeMemory, id: 'memory-2' })
    mockUpdateMemoryFact.mockResolvedValue({
      ...activeMemory,
      status: 'archived',
    })

    renderPageEs()

    await user.click(
      (await screen.findAllByRole('button', { name: /editar y aceptar/i }))[0]
    )
    const memoryText = screen.getByRole('textbox', {
      name: /texto de memoria/i,
    })
    await user.clear(memoryText)
    await user.type(memoryText, 'Captain Vess trusts the wizard.')
    await user.click(
      screen.getByRole('button', { name: /guardar y aceptar como memoria/i })
    )
    await waitFor(() => {
      expect(mockCreateMemoryFact).toHaveBeenCalledWith('camp-1', {
        source_session_id: 'sess-1',
        content: 'Captain Vess trusts the wizard.',
        type: 'relationship',
        importance: 'high',
      })
    })

    // The stamped card holds its stamp readable before filing itself away, so
    // wait it out rather than racing the second card's controls.
    await waitFor(
      () => {
        expect(screen.getAllByRole('article')).toHaveLength(1)
      },
      { timeout: LIFETIME_TIMEOUT_MS }
    )

    const dismiss = await screen.findByRole('button', { name: /^descartar$/i })
    await user.click(dismiss)
    expect(await screen.findByText(/tachada/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /retirar/i }))
    await waitFor(() => {
      expect(mockUpdateMemoryFact).toHaveBeenCalledWith('memory-1', {
        status: 'archived',
      })
    })
  })

  it('keeps Spanish accept and retire failures actionable', async () => {
    const user = userEvent.setup()
    mockCreateMemoryFact.mockRejectedValue(new Error('network'))
    mockUpdateMemoryFact.mockRejectedValue(new Error('network'))

    renderPageEs()

    const accept = await screen.findByRole('button', {
      name: /aceptar como memoria/i,
    })
    await user.click(accept)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /no se pudo sellar esa memoria/i
    )
    expect(accept).toBeEnabled()
    expect(screen.getByText(/captain vess owes/i)).toBeInTheDocument()

    const retire = screen.getByRole('button', { name: /retirar/i })
    await user.click(retire)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /no se pudo retirar esa memoria/i
    )
    expect(retire).toBeEnabled()
    expect(screen.getByText(/the guild remembers/i)).toBeInTheDocument()
  })
})

describe('MemoryReviewPage — recovering memory suggestions', () => {
  const recovered = {
    content: 'The warehouse fire exposed guild ledgers.',
    type: 'consequence',
    importance: 'medium',
    reason: 'Future faction pressure depends on this evidence.',
    related: ['Black Bear Guild'],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    searchParams.value = 'session=sess-1'
    mockGetCampaignDetail.mockResolvedValue(buildCampaignDetail())
    mockGetMemoryFacts.mockResolvedValue([activeMemory])
    // The empty pending lane is the only place the recovery action lives.
    mockReadMemoryReviewDraft.mockReturnValue(null)
  })

  async function findRecoverButton() {
    return screen.findByRole('button', {
      name: /ask the scribe to read it again/i,
    })
  }

  it('offers the recovery action inside the empty pending lane when a session is linked', async () => {
    renderPage()

    expect(await findRecoverButton()).toBeEnabled()
    expect(screen.getByText(/the margins are clean/i)).toBeInTheDocument()
    // Proposal-only language: nothing is written until the DM accepts.
    expect(
      screen.getByText(/nothing is written to your session/i)
    ).toBeInTheDocument()
  })

  it('renders no recovery action when no session is linked', async () => {
    searchParams.value = ''

    renderPage()

    await screen.findByText(/the margins are clean/i)
    expect(
      screen.queryByRole('button', {
        name: /ask the scribe to read it again/i,
      })
    ).not.toBeInTheDocument()
    // The not-eligible empty state is exactly today's copy, unchanged.
    expect(screen.getByText(/no suggestions await review/i)).toBeInTheDocument()
  })

  it('shows the quill loading treatment and disables the trigger while in flight', async () => {
    const user = userEvent.setup()
    const recovery = deferred<{ memory_suggestions: unknown[] }>()
    mockRecoverMemorySuggestions.mockReturnValue(recovery.promise)

    const { container } = renderPage()

    await user.click(await findRecoverButton())

    await waitFor(() => {
      expect(screen.getByText(/re-reading the session/i)).toBeInTheDocument()
    })
    expect(container.querySelector('.ll-quill')).not.toBeNull()
    expect(await findRecoverButton()).toBeDisabled()

    recovery.resolve({ memory_suggestions: [] })
  })

  it('does not fire two requests when the trigger is double-clicked', async () => {
    const user = userEvent.setup()
    const recovery = deferred<{ memory_suggestions: unknown[] }>()
    mockRecoverMemorySuggestions.mockReturnValue(recovery.promise)

    renderPage()

    const trigger = await findRecoverButton()
    await user.dblClick(trigger)

    expect(mockRecoverMemorySuggestions).toHaveBeenCalledTimes(1)

    recovery.resolve({ memory_suggestions: [] })
  })

  it('flows recovered proposals into the existing pending lane', async () => {
    const user = userEvent.setup()
    mockRecoverMemorySuggestions.mockResolvedValue({
      memory_suggestions: [recovered],
    })

    renderPage()

    await user.click(await findRecoverButton())

    expect(
      await screen.findByText(/the warehouse fire exposed guild ledgers/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/1 suggestion/i)).toBeInTheDocument()
    expect(screen.getByText(/❧ the scribe proposes/i)).toBeInTheDocument()
    expect(screen.queryByText(/the margins are clean/i)).not.toBeInTheDocument()
  })

  it('writes recovered proposals into the draft so they survive a remount', async () => {
    const user = userEvent.setup()
    mockRecoverMemorySuggestions.mockResolvedValue({
      memory_suggestions: [recovered],
    })

    const first = renderPage()

    await findRecoverButton()
    // The empty lane already completed the (absent) draft on mount; only what
    // happens after the recovery matters here.
    mockCompleteMemoryReviewDraft.mockClear()

    await user.click(await findRecoverButton())
    await screen.findByText(/the warehouse fire exposed guild ledgers/i)

    await waitFor(() => {
      expect(mockWriteMemoryReviewDraft).toHaveBeenCalledWith({
        campaign_id: 'camp-1',
        session_id: 'sess-1',
        session_number: null,
        memory_suggestions: [recovered],
      })
    })
    // The lane is populated, so the draft-completing effect must not clear it.
    expect(mockCompleteMemoryReviewDraft).not.toHaveBeenCalled()

    first.unmount()

    // A remount reads the draft the recovery just seeded.
    mockReadMemoryReviewDraft.mockReturnValue({
      version: 1,
      campaign_id: 'camp-1',
      session_id: 'sess-1',
      session_number: null,
      memory_suggestions: [recovered],
    })
    renderPage()

    expect(
      await screen.findByText(/the warehouse fire exposed guild ledgers/i)
    ).toBeInTheDocument()
  })

  it('lets the DM accept a recovered proposal exactly like a registration-time one', async () => {
    const user = userEvent.setup()
    mockRecoverMemorySuggestions.mockResolvedValue({
      memory_suggestions: [recovered],
    })
    mockCreateMemoryFact.mockResolvedValue({ ...activeMemory, id: 'memory-2' })

    renderPage()

    await user.click(await findRecoverButton())
    await user.click(
      await screen.findByRole('button', { name: /accept as memory/i })
    )

    await waitFor(() => {
      expect(mockCreateMemoryFact).toHaveBeenCalledWith('camp-1', {
        source_session_id: 'sess-1',
        content: 'The warehouse fire exposed guild ledgers.',
        type: 'consequence',
        importance: 'medium',
      })
    })
    expect(await screen.findByText(/★ accepted/i)).toBeInTheDocument()
  })

  it('lets the DM dismiss a recovered proposal without creating a memory fact', async () => {
    const user = userEvent.setup()
    mockRecoverMemorySuggestions.mockResolvedValue({
      memory_suggestions: [recovered],
    })

    renderPage()

    await user.click(await findRecoverButton())
    await user.click(await screen.findByRole('button', { name: /^dismiss$/i }))

    expect(await screen.findByText(/struck out/i)).toBeInTheDocument()
    expect(mockCreateMemoryFact).not.toHaveBeenCalled()
  })

  it('reports an empty proposal set honestly, never as an error', async () => {
    const user = userEvent.setup()
    mockRecoverMemorySuggestions.mockResolvedValue({ memory_suggestions: [] })

    renderPage()

    await user.click(await findRecoverButton())

    expect(await screen.findByText(/proposed nothing/i)).toBeInTheDocument()
    // An intentional empty result is a success: no error notice, no alert.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(
      screen.queryByText(/could not finish reading/i)
    ).not.toBeInTheDocument()
    // The trigger stays available so the DM can ask again.
    expect(await findRecoverButton()).toBeEnabled()
    expect(mockWriteMemoryReviewDraft).not.toHaveBeenCalled()
  })

  it('renders a provider failure as an error, never as "no proposals"', async () => {
    const user = userEvent.setup()
    const { SessionValidationError } = await import('@/lib/sessions/api')
    mockRecoverMemorySuggestions.mockRejectedValue(
      new SessionValidationError('unreadable output')
    )

    renderPage()

    await user.click(await findRecoverButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /could not finish reading/i
    )
    // The honest-empty copy must never stand in for a failure.
    expect(screen.queryByText(/proposed nothing/i)).not.toBeInTheDocument()
    expect(await findRecoverButton()).toBeEnabled()
  })

  it('distinguishes a rate-limit failure from a generic one', async () => {
    const user = userEvent.setup()
    const { SessionRateLimitError } = await import('@/lib/sessions/api')
    mockRecoverMemorySuggestions.mockRejectedValue(
      new SessionRateLimitError('Too many requests.')
    )

    renderPage()

    await user.click(await findRecoverButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /needs a moment/i
    )
    expect(
      screen.queryByText(/could not finish reading/i)
    ).not.toBeInTheDocument()
  })

  it('reports an unknown session distinctly', async () => {
    const user = userEvent.setup()
    const { SessionCampaignNotFoundError } = await import('@/lib/sessions/api')
    mockRecoverMemorySuggestions.mockRejectedValue(
      new SessionCampaignNotFoundError('Session sess-1 not found')
    )

    renderPage()

    await user.click(await findRecoverButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /could not find that session/i
    )
  })

  it('clears a previous failure when the DM retries successfully', async () => {
    const user = userEvent.setup()
    mockRecoverMemorySuggestions.mockRejectedValueOnce(new Error('network'))

    renderPage()

    await user.click(await findRecoverButton())
    await screen.findByRole('alert')

    mockRecoverMemorySuggestions.mockResolvedValueOnce({
      memory_suggestions: [recovered],
    })
    await user.click(await findRecoverButton())

    expect(
      await screen.findByText(/the warehouse fire exposed guild ledgers/i)
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('offers the recovery action in Spanish', async () => {
    const user = userEvent.setup()
    mockRecoverMemorySuggestions.mockResolvedValue({ memory_suggestions: [] })

    renderPageEs()

    const trigger = await screen.findByRole('button', {
      name: /pedir al escriba que la lea de nuevo/i,
    })
    await user.click(trigger)

    expect(await screen.findByText(/no ha propuesto nada/i)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
