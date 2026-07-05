import { useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type WorldStateEditorProps = {
  initialValue: string | null
}

/**
 * World state inline editor — view/edit toggle with local state management.
 * Save/Cancel buttons render but the mutation call (PATCH) is NOT wired yet — that's WU3.
 *
 * @param {object} root0 - The world state editor props.
 * @param {string | null} root0.initialValue - The initial world state text.
 * @returns {React.ReactElement} The world state editor element.
 */
export function WorldStateEditor({ initialValue }: WorldStateEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(initialValue ?? '')
  const [displayValue, setDisplayValue] = useState(initialValue ?? '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleEdit = () => {
    setDraft(displayValue)
    setIsEditing(true)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const handleSave = () => {
    setDisplayValue(draft)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setDraft(displayValue)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div>
        <Textarea
          ref={textareaRef}
          rows={5}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
        />
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="accent" onClick={handleSave}>
            Save changes
          </Button>
          <Button size="sm" variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="ll-dropcap font-serif text-[16.5px] leading-[1.65] text-[var(--ink)]">
        {displayValue || (
          <span className="italic text-[var(--ink-3)]">
            No world state recorded yet.
          </span>
        )}
      </p>
      <button
        type="button"
        className="mt-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)] hover:underline"
        onClick={handleEdit}
      >
        Edit
      </button>
    </div>
  )
}
