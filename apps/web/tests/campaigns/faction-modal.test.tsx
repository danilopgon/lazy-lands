import { render, screen, waitFor } from '@/tests/intl'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockCreateFaction, mockUpdateFaction } = vi.hoisted(() => ({
  mockCreateFaction: vi.fn(),
  mockUpdateFaction: vi.fn(),
}))

vi.mock('@/lib/campaigns/api', () => ({
  createFaction: mockCreateFaction,
  updateFaction: mockUpdateFaction,
  CampaignApiError: class CampaignApiError extends Error {},
}))

import { FactionModal } from '@/components/campaigns/faction-modal'

/** Render the faction modal inside a fresh QueryClientProvider. */
function renderModal(
  props: Partial<React.ComponentProps<typeof FactionModal>> = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <FactionModal
        campaignId="camp-1"
        faction={null}
        onClose={vi.fn()}
        {...props}
      />
    </QueryClientProvider>
  )
  return { ...utils, invalidateSpy }
}

describe('FactionModal — default path (real API)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates via the real createFaction client and invalidates the campaign query when onSubmit is omitted', async () => {
    const user = userEvent.setup()
    mockCreateFaction.mockResolvedValue({
      id: 'faction-new',
      name: 'The Silver Hand',
      description: null,
      current_stance: null,
      goals: null,
      content_source: 'manual',
    })
    const { invalidateSpy } = renderModal()

    await user.type(screen.getByLabelText(/name/i), 'The Silver Hand')
    await user.click(screen.getByRole('button', { name: /add faction/i }))

    await waitFor(() => {
      expect(mockCreateFaction).toHaveBeenCalledWith(
        expect.objectContaining({
          campaign_id: 'camp-1',
          name: 'The Silver Hand',
        })
      )
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['campaign', 'camp-1'],
    })
  })
})

describe('FactionModal — injected onSubmit adapter path', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls the adapter instead of the real API and skips invalidation', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const { invalidateSpy } = renderModal({ onSubmit })

    await user.type(screen.getByLabelText(/name/i), 'The Silver Hand')
    await user.click(screen.getByRole('button', { name: /add faction/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'The Silver Hand' })
      )
    })
    expect(mockCreateFaction).not.toHaveBeenCalled()
    expect(mockUpdateFaction).not.toHaveBeenCalled()
    expect(invalidateSpy).not.toHaveBeenCalled()
  })
})
