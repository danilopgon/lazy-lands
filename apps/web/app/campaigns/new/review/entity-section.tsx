'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { OriginBadge } from '@/components/ui/origin-badge'
import { contentSourceToBadgeOrigin } from '@/lib/campaigns/provenance'
import type { EntityField, ReviewItem } from './types'

export type { EntityField, ReviewItem } from './types'

type EntitySectionProps<T extends ReviewItem> = {
  title: string
  singular: string
  items: T[]
  fields: EntityField<T>[]
  /** Values applied to newly added items beyond the shared field/content_source shape (e.g. arc priority). */
  extraDefaults?: Partial<T>
  onChange: (items: T[]) => void
  testId: string
}

/**
 * Editable/removable/addable section for NPCs, factions, or arcs on the
 * campaign extraction review screen (CUI-002.1, CUI-002.3, CUI-002.4).
 *
 * @template T - The review item shape (NPC, faction, or arc).
 * @param {EntitySectionProps<T>} props - Section configuration and state callbacks.
 * @returns {React.ReactElement} The rendered entity section.
 */
export function EntitySection<T extends ReviewItem>({
  title,
  singular,
  items,
  fields,
  extraDefaults,
  onChange,
  testId,
}: EntitySectionProps<T>) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<Partial<T>>({})
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<T>>({})

  const primaryField = fields[0]

  /**
   * Start editing the item at the given index.
   *
   * @param {number} index - The index of the item to edit.
   */
  function startEdit(index: number) {
    setEditingIndex(index)
    setEditDraft({ ...items[index] })
  }

  /**
   * Save the in-progress edit, flipping content_source from llm to edited.
   *
   * @param {number} index - The index of the item being saved.
   */
  function saveEdit(index: number) {
    const current = items[index]
    const updated: T = {
      ...current,
      ...editDraft,
      content_source:
        current.content_source === 'llm' ? 'edited' : current.content_source,
    } as unknown as T
    onChange(items.map((item, i) => (i === index ? updated : item)))
    setEditingIndex(null)
  }

  /**
   * Remove the item at the given index.
   *
   * @param {number} index - The index of the item to remove.
   */
  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index))
    if (editingIndex === index) {
      setEditingIndex(null)
      setEditDraft({})
    } else if (editingIndex !== null && index < editingIndex) {
      // Removing an item before the one being edited shifts the array down;
      // keep editingIndex pointing at the same item instead of a stale slot.
      setEditingIndex(editingIndex - 1)
    }
  }

  /** Append the drafted new item, marked as DM-authored. */
  function addItem() {
    if (!draft[primaryField.key]) return
    const reviewId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${testId}-${Date.now()}`
    const newItem = {
      ...extraDefaults,
      ...draft,
      reviewId,
      content_source: 'manual',
    } as unknown as T
    onChange([...items, newItem])
    setDraft({})
    setAdding(false)
  }

  return (
    <section className="mt-8" data-testid={`${testId}-section`}>
      <div className="flex items-center justify-between pb-2">
        <h3 className="font-serif text-xl font-semibold text-[var(--ink)]">
          {title}{' '}
          <span className="text-sm text-[var(--ink-3)]">· {items.length}</span>
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setAdding(true)
            setDraft({})
          }}
        >
          + Add {singular}
        </Button>
      </div>

      <div className="border-2 border-[var(--border)] bg-[var(--paper)] px-4 shadow-[6px_6px_0_var(--shadow)]">
        {items.length === 0 && !adding && (
          <p className="py-3 text-sm text-[var(--ink-3)]">
            Nothing here yet. Add a {singular} manually if the Scribe missed
            one.
          </p>
        )}

        <ul className="divide-y divide-dotted divide-[var(--border)]">
          {items.map((item, index) => (
            <li
              key={item.reviewId}
              data-testid={`${testId}-item`}
              className="py-3"
            >
              {editingIndex === index ? (
                <div className="space-y-2">
                  {fields.map((field) => (
                    <Input
                      key={field.key}
                      placeholder={field.label}
                      value={(editDraft[field.key] as string) ?? ''}
                      onChange={(e) =>
                        setEditDraft({
                          ...editDraft,
                          [field.key]: e.target.value,
                        })
                      }
                    />
                  ))}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => saveEdit(index)}
                    >
                      Save changes
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingIndex(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-serif text-base text-[var(--ink)]">
                      {item[primaryField.key]}
                    </div>
                    {fields[1] && (
                      <div className="truncate text-sm text-[var(--ink-2)]">
                        {item[fields[1].key]}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <OriginBadge
                      origin={contentSourceToBadgeOrigin(item.content_source)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(index)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}

          {adding && (
            <li className="border-t border-dotted border-[var(--border)] py-3">
              <div className="space-y-2">
                {fields.map((field) => (
                  <Input
                    key={field.key}
                    placeholder={field.placeholder}
                    value={(draft[field.key] as string) ?? ''}
                    onChange={(e) =>
                      setDraft({ ...draft, [field.key]: e.target.value })
                    }
                  />
                ))}
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={addItem}>
                    Add
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setAdding(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </li>
          )}
        </ul>
      </div>
    </section>
  )
}
