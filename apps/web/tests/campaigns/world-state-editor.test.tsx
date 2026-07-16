import { render, screen, waitFor } from '@/tests/intl'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockUpdateCampaign } = vi.hoisted(() => ({
  mockUpdateCampaign: vi.fn(),
}))

vi.mock('@/lib/campaigns/api', () => ({
  updateCampaign: mockUpdateCampaign,
  CampaignApiError: class CampaignApiError extends Error {},
}))

import { WorldStateEditor } from '@/components/campaigns/world-state-editor'

/** Render the world state editor inside a fresh QueryClientProvider. */
function renderEditor(
  props: Partial<React.ComponentProps<typeof WorldStateEditor>> = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <WorldStateEditor
        campaignId="camp-1"
        initialValue="The old order holds, for now."
        {...props}
      />
    </QueryClientProvider>
  )
  return { ...utils, invalidateSpy }
}

describe('WorldStateEditor — default (real) path regression', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saves via the real updateCampaign client, updates displayValue, and invalidates the campaign query when onSave is omitted (pre-PR-82 contract)', async () => {
    const user = userEvent.setup()
    mockUpdateCampaign.mockResolvedValue({
      world_state: 'A new dawn breaks over Phandalin.',
    })
    const { invalidateSpy } = renderEditor()

    await user.click(screen.getByRole('button', { name: /edit/i }))
    const textarea = screen.getByRole('textbox')
    await user.clear(textarea)
    await user.type(textarea, 'A new dawn breaks over Phandalin.')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(mockUpdateCampaign).toHaveBeenCalledWith('camp-1', {
        world_state: 'A new dawn breaks over Phandalin.',
      })
    })
    await waitFor(() => {
      expect(
        screen.getByText('A new dawn breaks over Phandalin.')
      ).toBeInTheDocument()
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['campaign', 'camp-1'],
    })
  })

  it('keeps the draft open with an inline error when the real save fails', async () => {
    const user = userEvent.setup()
    mockUpdateCampaign.mockRejectedValue(new Error('network down'))
    renderEditor()

    await user.click(screen.getByRole('button', { name: /edit/i }))
    const textarea = screen.getByRole('textbox')
    await user.clear(textarea)
    await user.type(textarea, 'A doomed edit.')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/could not save the world state/i)
      ).toBeInTheDocument()
    })
    expect(screen.getByRole('textbox')).toHaveValue('A doomed edit.')
  })
})

describe('WorldStateEditor — injected onSave adapter path', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls the adapter instead of the real API and skips invalidation', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue('A locally-saved world state.')
    const { invalidateSpy } = renderEditor({ onSave })

    await user.click(screen.getByRole('button', { name: /edit/i }))
    const textarea = screen.getByRole('textbox')
    await user.clear(textarea)
    await user.type(textarea, 'A locally-saved world state.')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('A locally-saved world state.')
    })
    expect(mockUpdateCampaign).not.toHaveBeenCalled()
    expect(invalidateSpy).not.toHaveBeenCalled()
  })
})
