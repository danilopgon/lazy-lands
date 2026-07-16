'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Notice } from '@/components/ui/notice'
import { Textarea } from '@/components/ui/textarea'
import { createArc, updateArc, CampaignApiError } from '@/lib/campaigns/api'

import type { ArcResponse, ArcStatus, Priority } from '@/lib/campaigns/schemas'

/** The editable arc fields a save receives, with the enum codes as stored. */
export type ArcDraft = {
  title: string
  description: string | null
  priority: Priority
  status: ArcStatus
}

type ArcModalProps = {
  campaignId: string
  /** The arc to edit, or null to create a new one. */
  arc: ArcResponse | null
  onClose: () => void
  /**
   * Optional save adapter. When provided it fully replaces the default
   * `POST /arcs` / `PATCH /arcs/{id}` write path (and its query invalidation),
   * letting the public demo persist to local state instead.
   */
  onSubmit?: (draft: ArcDraft) => Promise<void>
}

const PRIORITIES: Priority[] = ['high', 'medium', 'low']
const STATUSES: ArcStatus[] = ['active', 'dormant', 'resolved', 'discarded']

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
 * @param {(draft: ArcDraft) => Promise<void>} [root0.onSubmit] - Optional local save adapter.
 * @returns {React.ReactElement} The arc modal element.
 */
export function ArcModal({
  campaignId,
  arc,
  onClose,
  onSubmit,
}: ArcModalProps) {
  const isEdit = arc !== null
  const t = useTranslations('Campaigns')
  const errorT = useTranslations('Errors')
  const te = useTranslations('Entities')
  const queryClient = useQueryClient()
  const [title, setTitle] = useState(arc?.title ?? '')
  const [description, setDescription] = useState(arc?.description ?? '')
  const [priority, setPriority] = useState<Priority>(arc?.priority ?? 'medium')
  const [status, setStatus] = useState<ArcStatus>(arc?.status ?? 'active')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async (): Promise<void> => {
      // Empty description sent as null so an edit can clear a set value.
      const fields: ArcDraft = {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        status,
      }
      if (onSubmit) {
        await onSubmit(fields)
        return
      }
      if (isEdit) {
        await updateArc(arc.id, fields)
      } else {
        await createArc({ campaign_id: campaignId, ...fields })
      }
    },
    onSuccess: () => {
      if (!onSubmit) {
        queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] })
      }
      onClose()
    },
    onError: (err: unknown) => {
      setError(
        err instanceof CampaignApiError
          ? errorT(err.messageKey)
          : t('arcs.saveError')
      )
    },
  })

  return (
    <Modal
      title={isEdit ? t('arcs.editTitle') : t('arcs.newTitle')}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {te('cancel')}
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
              ? te('saving')
              : isEdit
                ? te('saveChanges')
                : t('arcs.addAction')}
          </Button>
        </>
      }
    >
      {error ? (
        <Notice className="mb-3" variant="error">
          <p>{error}</p>
        </Notice>
      ) : null}
      <Field label={te('fields.title')}>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label={te('fields.description')}>
        <Textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={te('fields.priority')}>
          <select
            className={selectClass}
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {te(`priority.${p}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={te('fields.status')}>
          <select
            className={selectClass}
            value={status}
            onChange={(e) => setStatus(e.target.value as ArcStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {te(`status.${s}`)}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </Modal>
  )
}
