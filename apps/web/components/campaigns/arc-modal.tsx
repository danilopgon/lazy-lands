'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Notice } from '@/components/ui/notice'
import { Textarea } from '@/components/ui/textarea'
import { createArc, updateArc, CampaignApiError } from '@/lib/campaigns/api'

import type { ArcResponse, ArcStatus, Priority } from '@/lib/campaigns/schemas'

type ArcModalProps = {
  campaignId: string
  /** The arc to edit, or null to create a new one. */
  arc: ArcResponse | null
  onClose: () => void
}

const PRIORITIES: Priority[] = ['high', 'medium', 'low']
const STATUSES: ArcStatus[] = ['active', 'dormant', 'resolved', 'discarded']

/** Present a stable lowercase code as a capitalized label (design Decision 9). */
function label(code: string): string {
  return code.charAt(0).toUpperCase() + code.slice(1)
}

const selectClass =
  'w-full border-[1.5px] border-dashed border-[var(--dotted)] bg-[var(--paper)] px-3 py-2 font-sans text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none'

/**
 * Create/edit modal for an arc, wired to `POST /arcs` / `PATCH /arcs/{id}`.
 *
 * Priority and status are the real enum codes (active/dormant/resolved/
 * discarded), shown as capitalized labels and submitted as lowercase codes.
 * Status changes (Resolve/Discard/Reopen in the handoff) happen through this
 * modal — there is no separate inline write path (design deviation, 2.5.8).
 * Save is disabled while the title is empty; `content_source` is never sent.
 *
 * @param {object} root0 - The arc modal props.
 * @param {string} root0.campaignId - The owning campaign id.
 * @param {ArcResponse | null} root0.arc - The arc being edited, or null to add.
 * @param {() => void} root0.onClose - Invoked to close the modal.
 * @returns {React.ReactElement} The arc modal element.
 */
export function ArcModal({ campaignId, arc, onClose }: ArcModalProps) {
  const isEdit = arc !== null
  const queryClient = useQueryClient()
  const [title, setTitle] = useState(arc?.title ?? '')
  const [description, setDescription] = useState(arc?.description ?? '')
  const [priority, setPriority] = useState<Priority>(arc?.priority ?? 'medium')
  const [status, setStatus] = useState<ArcStatus>(arc?.status ?? 'active')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => {
      // Empty description sent as null so an edit can clear a set value.
      const fields = {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        status,
      }
      return isEdit
        ? updateArc(arc.id, fields)
        : createArc({ campaign_id: campaignId, ...fields })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] })
      onClose()
    },
    onError: (err: unknown) => {
      setError(
        err instanceof CampaignApiError
          ? err.message
          : 'Could not save this arc. Please try again.'
      )
    },
  })

  return (
    <Modal
      title={isEdit ? 'Edit arc' : 'New arc'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="ink"
            disabled={!title.trim() || mutation.isPending}
            onClick={() => {
              setError(null)
              mutation.mutate()
            }}
          >
            {mutation.isPending
              ? 'Saving…'
              : isEdit
                ? 'Save changes'
                : 'Add arc'}
          </Button>
        </>
      }
    >
      {error ? (
        <Notice className="mb-3" variant="error">
          <p>{error}</p>
        </Notice>
      ) : null}
      <Field label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Description">
        <Textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Priority">
          <select
            className={selectClass}
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {label(p)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select
            className={selectClass}
            value={status}
            onChange={(e) => setStatus(e.target.value as ArcStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </Modal>
  )
}
