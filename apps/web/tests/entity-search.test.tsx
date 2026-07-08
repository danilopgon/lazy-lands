import { render, screen } from '@/tests/intl'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { EntitySearch } from '@/components/campaigns/entity-search'

describe('EntitySearch', () => {
  it('renders the input and the visible/total counter', () => {
    render(
      <EntitySearch
        value=""
        onChange={vi.fn()}
        placeholder="Search NPCs"
        countLabel="3 of 5"
      />
    )

    expect(screen.getByLabelText('Search NPCs')).toBeInTheDocument()
    expect(screen.getByText('3 of 5')).toBeInTheDocument()
  })

  it('reports each typed character to onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <EntitySearch
        value=""
        onChange={onChange}
        placeholder="Search NPCs"
        countLabel="5 of 5"
      />
    )

    await user.type(screen.getByLabelText('Search NPCs'), 'a')

    expect(onChange).toHaveBeenCalledWith('a')
  })
})
