import { render, screen, waitFor } from '@/tests/intl'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockCreateNpc, mockUpdateNpc } = vi.hoisted(() => ({
  mockCreateNpc: vi.fn(),
  mockUpdateNpc: vi.fn(),
}))

vi.mock('@/lib/campaigns/api', () => ({
  createNpc: mockCreateNpc,
  updateNpc: mockUpdateNpc,
  CampaignApiError: class CampaignApiError extends Error {},
}))

import { NpcModal } from '@/components/campaigns/npc-modal'

/** Render the NPC modal inside a fresh QueryClientProvider. */
function renderModal(
  props: Partial<React.ComponentProps<typeof NpcModal>> = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <NpcModal campaignId="camp-1" npc={null} onClose={vi.fn()} {...props} />
    </QueryClientProvider>
  )
  return { ...utils, invalidateSpy }
}

describe('NpcModal — default path (real API)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates via the real createNpc client and invalidates the campaign query when onSubmit is omitted', async () => {
    const user = userEvent.setup()
    mockCreateNpc.mockResolvedValue({
      id: 'npc-new',
      name: 'Toblen',
      description: null,
      current_state: null,
      motivation: null,
      content_source: 'manual',
    })
    const { invalidateSpy } = renderModal()

    await user.type(screen.getByLabelText(/name/i), 'Toblen')
    await user.click(screen.getByRole('button', { name: /add npc/i }))

    await waitFor(() => {
      expect(mockCreateNpc).toHaveBeenCalledWith(
        expect.objectContaining({ campaign_id: 'camp-1', name: 'Toblen' })
      )
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['campaign', 'camp-1'],
    })
  })
})

describe('NpcModal — injected onSubmit adapter path', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls the adapter instead of the real API and skips invalidation', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const { invalidateSpy } = renderModal({ onSubmit })

    await user.type(screen.getByLabelText(/name/i), 'Toblen')
    await user.click(screen.getByRole('button', { name: /add npc/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Toblen' })
      )
    })
    expect(mockCreateNpc).not.toHaveBeenCalled()
    expect(mockUpdateNpc).not.toHaveBeenCalled()
    expect(invalidateSpy).not.toHaveBeenCalled()
  })
})
