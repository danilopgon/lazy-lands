import { render, screen, waitFor } from '@/tests/intl'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NextIntlClientProvider } from 'next-intl'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import en from '@/messages/en.json'
import es from '@/messages/es.json'

const {
  mockGetCampaignDetail,
  mockGetMemoryFacts,
  mockCreateMemoryFact,
  mockUpdateMemoryFact,
  mockReadMemoryReviewDraft,
  mockCompleteMemoryReviewDraft,
  mockRewriteMemoryReviewDraftSuggestions,
  mockPush,
} = vi.hoisted(() => ({
  mockGetCampaignDetail: vi.fn(),
  mockGetMemoryFacts: vi.fn(),
  mockCreateMemoryFact: vi.fn(),
  mockUpdateMemoryFact: vi.fn(),
  mockReadMemoryReviewDraft: vi.fn(),
  mockCompleteMemoryReviewDraft: vi.fn(),
  mockRewriteMemoryReviewDraftSuggestions: vi.fn(),
  mockPush: vi.fn(),
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
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'camp-1' }),
  useSearchParams: () => new URLSearchParams('session=sess-1'),
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

    await waitFor(() => {
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
    })
    expect(mockCompleteMemoryReviewDraft).not.toHaveBeenCalled()
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
