'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { OriginBadge } from '@/components/ui/origin-badge'

type EditableProseProps = {
  label: string
  value: string
  /** True once the DM has edited the Scribe's draft — flips the provenance badge. */
  edited: boolean
  onSave: (next: string) => void
  /** Render a multi-line textarea instead of a single-line input. */
  multiline?: boolean
  rows?: number
  testId: string
}

/**
 * A Scribe-drafted prose block (campaign title, summary, world state) shown
 * read-only until the DM clicks Edit — matching the extraction-review handoff.
 * Editing flips its provenance badge from "Scribe" to "Edited by you".
 *
 * @param {EditableProseProps} props - Label, current value, provenance and save callback.
 * @returns {React.ReactElement} The editable prose section.
 */
export function EditableProse({
  label,
  value,
  edited,
  onSave,
  multiline = false,
  rows = 3,
  testId,
}: EditableProseProps) {
  const t = useTranslations('Entities')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  /** Enter edit mode, seeding the draft with the current value. */
  function startEdit() {
    setDraft(value)
    setEditing(true)
  }

  /** Commit the draft and leave edit mode. */
  function save() {
    onSave(draft)
    setEditing(false)
  }

  return (
    <section className="mt-6" data-testid={testId}>
      <div className="flex items-center justify-between gap-3 pb-2">
        <h3 className="font-serif text-xl font-semibold text-[var(--ink)]">
          {label}
        </h3>
        <OriginBadge origin={edited ? 'edited' : 'scribe'} />
      </div>

      {editing ? (
        <div className="space-y-2">
          {multiline ? (
            <Textarea
              aria-label={label}
              value={draft}
              rows={rows}
              onChange={(event) => setDraft(event.target.value)}
              autoFocus
            />
          ) : (
            <Input
              aria-label={label}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="font-serif text-xl font-semibold"
              autoFocus
            />
          )}
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={save}>
              {t('saveChanges')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditing(false)}
            >
              {t('cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-2 border-[var(--border)] bg-[var(--paper)] p-4 shadow-[4px_4px_0_var(--shadow)]">
          <p
            className={
              multiline
                ? 'whitespace-pre-wrap font-serif text-[15px] leading-relaxed text-[var(--ink)]'
                : 'font-serif text-xl font-semibold text-[var(--ink)]'
            }
          >
            {value}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={startEdit}
          >
            {t('edit')}
          </Button>
        </div>
      )}
    </section>
  )
}
