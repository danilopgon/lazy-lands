import { render, screen } from '@/tests/intl'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { EntityFilterBar } from '@/components/campaigns/entity-filter-bar'

const OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'dormant', label: 'Dormant' },
] as const

describe('EntityFilterBar', () => {
  it('renders one pill per option and marks the active one pressed', () => {
    render(
      <EntityFilterBar
        label="Filter by status"
        options={[...OPTIONS]}
        active="active"
        onChange={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: 'Active' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
  })

  it('calls onChange with the chosen option value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <EntityFilterBar
        label="Filter by status"
        options={[...OPTIONS]}
        active="all"
        onChange={onChange}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Dormant' }))

    expect(onChange).toHaveBeenCalledWith('dormant')
  })
})
