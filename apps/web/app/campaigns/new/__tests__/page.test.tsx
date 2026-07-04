import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockExtractCampaign, mockPush, mockSaveExtractionDraft } = vi.hoisted(
  () => ({
    mockExtractCampaign: vi.fn(),
    mockPush: vi.fn(),
    mockSaveExtractionDraft: vi.fn(),
  })
)

vi.mock('@/lib/campaigns/api', () => ({
  extractCampaign: mockExtractCampaign,
  CampaignApiError: class CampaignApiError extends Error {},
}))

vi.mock('@/lib/campaigns/draft-storage', () => ({
  saveExtractionDraft: mockSaveExtractionDraft,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

import NewCampaignPage from '../page'

/**
 * Render the page wrapped in a fresh QueryClientProvider (required by
 * TanStack Query's useMutation).
 *
 * @returns {ReturnType<typeof render>} The RTL render result.
 */
function renderPage() {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <NewCampaignPage />
    </QueryClientProvider>
  )
}

const VALID_PREMISE = 'a'.repeat(150)

describe('NewCampaignPage (CUI-001)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('shows a live character counter as the DM types', async () => {
    const user = userEvent.setup()
    renderPage()

    const textarea = screen.getByLabelText(/premise/i)
    await user.type(textarea, 'short text')

    expect(screen.getByText(/10\s*\/\s*8000/)).toBeInTheDocument()
  })

  it('CUI-001: premise under 100 chars blocks submission client-side, text preserved', async () => {
    const user = userEvent.setup()
    renderPage()

    const textarea = screen.getByLabelText(/premise/i)
    await user.type(textarea, 'too short')
    await user.click(screen.getByRole('button', { name: /analyze/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(mockExtractCampaign).not.toHaveBeenCalled()
    expect(textarea).toHaveValue('too short')
  })

  it('CUI-001: premise over 8000 chars blocks submission client-side, text preserved', async () => {
    const user = userEvent.setup()
    renderPage()
    const tooLong = 'a'.repeat(8001)

    const textarea = screen.getByLabelText(/premise/i)
    await user.click(textarea)
    await user.paste(tooLong)
    await user.click(screen.getByRole('button', { name: /analyze/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(mockExtractCampaign).not.toHaveBeenCalled()
    expect(textarea).toHaveValue(tooLong)
  })

  it('valid premise calls extractCampaign and navigates to review on success', async () => {
    const user = userEvent.setup()
    const payload = {
      title: 'Shadows over Phandalin',
      description: 'desc',
      world_state: 'state',
      npcs: [],
      factions: [],
      arcs: [],
    }
    mockExtractCampaign.mockResolvedValue(payload)
    renderPage()

    const textarea = screen.getByLabelText(/premise/i)
    await user.click(textarea)
    await user.paste(VALID_PREMISE)
    await user.click(screen.getByRole('button', { name: /analyze/i }))

    await waitFor(() => {
      expect(mockExtractCampaign).toHaveBeenCalledWith(VALID_PREMISE)
    })
    await waitFor(() => {
      expect(mockSaveExtractionDraft).toHaveBeenCalledWith(payload)
      expect(mockPush).toHaveBeenCalledWith('/campaigns/new/review')
    })
  })

  it('backend error preserves typed text and shows a message; form stays interactive', async () => {
    const user = userEvent.setup()
    const { CampaignApiError } = await import('@/lib/campaigns/api')
    mockExtractCampaign.mockRejectedValue(
      new CampaignApiError('The Scribe could not parse that.')
    )
    renderPage()

    const textarea = screen.getByLabelText(/premise/i)
    await user.click(textarea)
    await user.paste(VALID_PREMISE)
    await user.click(screen.getByRole('button', { name: /analyze/i }))

    await waitFor(() => {
      expect(screen.getByText(/could not parse that/i)).toBeInTheDocument()
    })
    expect(textarea).toHaveValue(VALID_PREMISE)
    expect(mockPush).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /analyze/i })).toBeEnabled()
  })

  it('disables the submit control and shows a loading indicator while in flight', async () => {
    const user = userEvent.setup()
    let resolvePromise: (value: unknown) => void
    mockExtractCampaign.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve
      })
    )
    renderPage()

    const textarea = screen.getByLabelText(/premise/i)
    await user.click(textarea)
    await user.paste(VALID_PREMISE)
    await user.click(screen.getByRole('button', { name: /analyze/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /analyzing/i })).toBeDisabled()
    })

    resolvePromise!({
      title: 't',
      description: 'd',
      world_state: 'w',
      npcs: [],
      factions: [],
      arcs: [],
    })
  })
})
