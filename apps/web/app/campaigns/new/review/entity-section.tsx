'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { OriginBadge } from '@/components/ui/origin-badge'
import type { ContentSource } from '@/lib/campaigns/schemas'

/** Common shape shared by NPC/faction/arc review items. */
export type ReviewItem = Record<string, string> & {
  content_source: ContentSource
}

export type EntityField<T extends ReviewItem> = {
  key: keyof T & string
  label: string
  placeholder: string
}

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
 * Map a `content_source` value to the shared provenance badge variant.
 *
 * @param {ContentSource} contentSource - The item's provenance value.
 * @returns {'scribe' | 'edited'} The `OriginBadge` variant.
 */
function toBadgeOrigin(contentSource: ContentSource): 'scribe' | 'edited' {
  return contentSource === 'llm' ? 'scribe' : 'edited'
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
  }

  /** Append the drafted new item, marked as DM-authored. */
  function addItem() {
    if (!draft[primaryField.key]) return
    const newItem = {
      ...extraDefaults,
      ...draft,
      content_source: 'manual',
    } as unknown as T
    onChange([...items, newItem])
    setDraft({})
    setAdding(false)
  }

  return (
    <section className="mt-8" data-testid={`${testId}-section`}>
      <div className="flex items-center justify-between border-b-2 border-[var(--border)] pb-2">
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

      {items.length === 0 && !adding && (
        <p className="mt-3 text-sm text-[var(--ink-3)]">
          Nothing here yet. Add a {singular} manually if the Scribe missed one.
        </p>
      )}

      <ul className="mt-2 space-y-2">
        {items.map((item, index) => (
          <li
            key={index}
            data-testid={`${testId}-item`}
            className="border-b border-dotted border-[var(--border)] py-3"
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
                  <OriginBadge origin={toBadgeOrigin(item.content_source)} />
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
    </section>
  )
}
