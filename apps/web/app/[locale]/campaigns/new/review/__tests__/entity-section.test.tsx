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
 * @param {EntityField<Row>[]} [root0.fields] - Field descriptors (defaults to FIELDS).
 * @returns {React.ReactElement} The wrapped section.
 */
function Harness({
  initial,
  fields = FIELDS,
}: {
  initial: Row[]
  fields?: EntityField<Row>[]
}) {
  const [items, setItems] = useState<Row[]>(initial)
  return (
    <EntitySection<Row>
      title="NPCs"
      addLabel="+ Add NPC"
      emptyHint="Nothing here yet."
      items={items}
      fields={fields}
      onChange={setItems}
      testId="npc"
    />
  )
}

const MULTILINE_FIELDS: EntityField<Row>[] = [
  { key: 'name', label: 'Name', placeholder: 'Name' },
  { key: 'note', label: 'Note', placeholder: 'Note', multiline: true },
]

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

  it('renders a multiline field as a textarea in the add form', async () => {
    const user = userEvent.setup()
    render(<Harness initial={[]} fields={MULTILINE_FIELDS} />)

    await user.click(screen.getByRole('button', { name: /add npc/i }))

    expect(screen.getByPlaceholderText('Name').tagName).toBe('INPUT')
    expect(screen.getByPlaceholderText('Note').tagName).toBe('TEXTAREA')
  })

  it('renders a multiline field as a textarea in the edit form', async () => {
    const user = userEvent.setup()
    render(
      <Harness
        initial={[
          { reviewId: 'a', name: 'Alpha', note: 'long', content_source: 'llm' },
        ]}
        fields={MULTILINE_FIELDS}
      />
    )

    await user.click(screen.getByRole('button', { name: /edit/i }))

    expect(screen.getByDisplayValue('Alpha').tagName).toBe('INPUT')
    expect(screen.getByDisplayValue('long').tagName).toBe('TEXTAREA')
  })
})
