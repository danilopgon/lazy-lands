import { render, screen, waitFor } from '@/tests/intl'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockCreateArc, mockUpdateArc } = vi.hoisted(() => ({
  mockCreateArc: vi.fn(),
  mockUpdateArc: vi.fn(),
}))

vi.mock('@/lib/campaigns/api', () => ({
  createArc: mockCreateArc,
  updateArc: mockUpdateArc,
  CampaignApiError: class CampaignApiError extends Error {},
}))

import { ArcModal } from '@/components/campaigns/arc-modal'

/** Render the arc modal inside a fresh QueryClientProvider. */
function renderModal(
  props: Partial<React.ComponentProps<typeof ArcModal>> = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <ArcModal campaignId="camp-1" arc={null} onClose={vi.fn()} {...props} />
    </QueryClientProvider>
  )
  return { ...utils, invalidateSpy }
}

describe('ArcModal — default path (real API)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates via the real createArc client and invalidates the campaign query when onSubmit is omitted', async () => {
    const user = userEvent.setup()
    mockCreateArc.mockResolvedValue({
      id: 'arc-new',
      title: 'The Lost Caravan',
      description: null,
      priority: 'medium',
      status: 'active',
      content_source: 'manual',
    })
    const { invalidateSpy } = renderModal()

    await user.type(screen.getByLabelText(/title/i), 'The Lost Caravan')
    await user.click(screen.getByRole('button', { name: /add arc/i }))

    await waitFor(() => {
      expect(mockCreateArc).toHaveBeenCalledWith(
        expect.objectContaining({
          campaign_id: 'camp-1',
          title: 'The Lost Caravan',
        })
      )
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['campaign', 'camp-1'],
    })
  })
})

describe('ArcModal — injected onSubmit adapter path', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls the adapter instead of the real API and skips invalidation', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const { invalidateSpy } = renderModal({ onSubmit })

    await user.type(screen.getByLabelText(/title/i), 'The Lost Caravan')
    await user.click(screen.getByRole('button', { name: /add arc/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'The Lost Caravan' })
      )
    })
    expect(mockCreateArc).not.toHaveBeenCalled()
    expect(mockUpdateArc).not.toHaveBeenCalled()
    expect(invalidateSpy).not.toHaveBeenCalled()
  })
})
