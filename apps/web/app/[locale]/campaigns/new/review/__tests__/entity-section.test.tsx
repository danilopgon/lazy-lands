import { useState } from 'react'
import { render, screen, waitFor, within } from '@/tests/intl'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { EntitySection } from '../entity-section'
import type { EntityField, ReviewItem } from '../types'

type Row = ReviewItem & { name: string; note: string }

const FIELDS: EntityField<Row>[] = [
  { key: 'name', label: 'Name', placeholder: 'Name' },
  { key: 'note', label: 'Note', placeholder: 'Note' },
]

/**
 * Stateful harness so the controlled EntitySection has a real onChange sink.
 *
 * @param {object} root0 - Harness props.
 * @param {Row[]} root0.initial - The seed items.
 * @returns {React.ReactElement} The wrapped section.
 */
function Harness({ initial }: { initial: Row[] }) {
  const [items, setItems] = useState<Row[]>(initial)
  return (
    <EntitySection<Row>
      title="NPCs"
      addLabel="+ Add NPC"
      emptyHint="Nothing here yet."
      items={items}
      fields={FIELDS}
      onChange={setItems}
      testId="npc"
    />
  )
}

describe('EntitySection', () => {
  it('keeps the edit form on the same item when an earlier item is removed', async () => {
    const user = userEvent.setup()
    render(
      <Harness
        initial={[
          { reviewId: 'a', name: 'Alpha', note: 'x', content_source: 'llm' },
          { reviewId: 'b', name: 'Beta', note: 'y', content_source: 'llm' },
        ]}
      />
    )

    // Start editing the SECOND item (Beta, array index 1).
    const betaRow = screen
      .getByText('Beta')
      .closest('[data-testid="npc-item"]') as HTMLElement
    await user.click(within(betaRow).getByRole('button', { name: /edit/i }))

    // Remove the FIRST item (Alpha, array index 0) — the array shifts down.
    const alphaRow = screen
      .getByText('Alpha')
      .closest('[data-testid="npc-item"]') as HTMLElement
    await user.click(within(alphaRow).getByRole('button', { name: /remove/i }))

    // The edit form must still target Beta, not a stale slot or Alpha.
    const editInput = await screen.findByDisplayValue('Beta')
    await user.clear(editInput)
    await user.type(editInput, 'Beta the Bold')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByText('Beta the Bold')).toBeInTheDocument()
    })
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
  })
})
