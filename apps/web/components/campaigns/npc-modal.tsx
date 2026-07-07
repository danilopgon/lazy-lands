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
import { createNpc, updateNpc, CampaignApiError } from '@/lib/campaigns/api'

import type { NpcResponse } from '@/lib/campaigns/schemas'

type NpcModalProps = {
  campaignId: string
  /** The NPC to edit, or null to create a new one. */
  npc: NpcResponse | null
  onClose: () => void
}

/**
 * Create/edit modal for an NPC, wired to `POST /npcs` / `PATCH /npcs/{id}`.
 *
 * Fields are free text (the backend `current_state`/`motivation` are prose, not
 * enums). Save is disabled while the name is empty; on API error the modal
 * stays open with an inline error. `content_source` is never sent — the backend
 * forces `manual` on create and preserves it on edit.
 *
 * @param {object} root0 - The NPC modal props.
 * @param {string} root0.campaignId - The owning campaign id.
 * @param {NpcResponse | null} root0.npc - The NPC being edited, or null to add.
 * @param {() => void} root0.onClose - Invoked to close the modal.
 * @returns {React.ReactElement} The NPC modal element.
 */
export function NpcModal({ campaignId, npc, onClose }: NpcModalProps) {
  const isEdit = npc !== null
  const t = useTranslations('Campaigns')
  const te = useTranslations('Entities')
  const queryClient = useQueryClient()
  const [name, setName] = useState(npc?.name ?? '')
  const [description, setDescription] = useState(npc?.description ?? '')
  const [currentState, setCurrentState] = useState(npc?.current_state ?? '')
  const [motivation, setMotivation] = useState(npc?.motivation ?? '')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => {
      // Empty optional fields are sent as null so an edit can clear a
      // previously-set value (the PATCH route keeps explicit nulls).
      const fields = {
        name: name.trim(),
        description: description.trim() || null,
        current_state: currentState.trim() || null,
        motivation: motivation.trim() || null,
      }
      return isEdit
        ? updateNpc(npc.id, fields)
        : createNpc({ campaign_id: campaignId, ...fields })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] })
      onClose()
    },
    onError: (err: unknown) => {
      setError(
        err instanceof CampaignApiError ? err.message : t('npcs.saveError')
      )
    },
  })

  return (
    <Modal
      title={isEdit ? t('npcs.editTitle') : t('npcs.newTitle')}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {te('cancel')}
          </Button>
          <Button
            variant="ink"
            disabled={!name.trim() || mutation.isPending}
            onClick={() => {
              setError(null)
              mutation.mutate()
            }}
          >
            {mutation.isPending
              ? te('saving')
              : isEdit
                ? te('saveChanges')
                : t('npcs.addAction')}
          </Button>
        </>
      }
    >
      {error ? (
        <Notice className="mb-3" variant="error">
          <p>{error}</p>
        </Notice>
      ) : null}
      <Field label={te('fields.name')}>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label={te('fields.description')}>
        <Textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <Field label={te('fields.currentState')}>
        <Textarea
          rows={2}
          value={currentState}
          onChange={(e) => setCurrentState(e.target.value)}
        />
      </Field>
      <Field label={te('fields.motivation')}>
        <Textarea
          rows={2}
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
        />
      </Field>
    </Modal>
  )
}
