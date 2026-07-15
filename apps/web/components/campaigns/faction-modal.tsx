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
import {
  createFaction,
  updateFaction,
  CampaignApiError,
} from '@/lib/campaigns/api'

import type { FactionResponse } from '@/lib/campaigns/schemas'

/** The editable faction fields a save receives, with cleared optionals as `null`. */
export type FactionDraft = {
  name: string
  description: string | null
  current_stance: string | null
  goals: string | null
}

type FactionModalProps = {
  campaignId: string
  /** The faction to edit, or null to create a new one. */
  faction: FactionResponse | null
  onClose: () => void
  /**
   * Optional save adapter. When provided it fully replaces the default
   * `POST /factions` / `PATCH /factions/{id}` write path (and its query
   * invalidation), letting the public demo persist to local state instead.
   */
  onSubmit?: (draft: FactionDraft) => Promise<void>
}

/**
 * Create/edit modal for a faction, wired to `POST /factions` /
 * `PATCH /factions/{id}`. Posture (`current_stance`) is edited here as free
 * text — there is no separate inline posture write path (design deviation,
 * flagged in 2.5.8). Save is disabled while the name is empty; API errors keep
 * the modal open with an inline error. `content_source` is never sent.
 *
 * @param {object} root0 - The faction modal props.
 * @param {string} root0.campaignId - The owning campaign id.
 * @param {FactionResponse | null} root0.faction - The faction being edited, or null to add.
 * @param {() => void} root0.onClose - Invoked to close the modal.
 * @param {(draft: FactionDraft) => Promise<void>} [root0.onSubmit] - Optional local save adapter.
 * @returns {React.ReactElement} The faction modal element.
 */
export function FactionModal({
  campaignId,
  faction,
  onClose,
  onSubmit,
}: FactionModalProps) {
  const isEdit = faction !== null
  const t = useTranslations('Campaigns')
  const errorT = useTranslations('Errors')
  const te = useTranslations('Entities')
  const queryClient = useQueryClient()
  const [name, setName] = useState(faction?.name ?? '')
  const [description, setDescription] = useState(faction?.description ?? '')
  const [currentStance, setCurrentStance] = useState(
    faction?.current_stance ?? ''
  )
  const [goals, setGoals] = useState(faction?.goals ?? '')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async (): Promise<void> => {
      // Empty optionals sent as null so an edit can clear a set value.
      const fields: FactionDraft = {
        name: name.trim(),
        description: description.trim() || null,
        current_stance: currentStance.trim() || null,
        goals: goals.trim() || null,
      }
      if (onSubmit) {
        await onSubmit(fields)
        return
      }
      if (isEdit) {
        await updateFaction(faction.id, fields)
      } else {
        await createFaction({ campaign_id: campaignId, ...fields })
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
          : t('factions.saveError')
      )
    },
  })

  return (
    <Modal
      title={isEdit ? t('factions.editTitle') : t('factions.newTitle')}
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
                : t('factions.addAction')}
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
      <Field label={te('fields.currentStance')}>
        <Textarea
          rows={2}
          value={currentStance}
          onChange={(e) => setCurrentStance(e.target.value)}
        />
      </Field>
      <Field label={te('fields.objective')}>
        <Textarea
          rows={2}
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
        />
      </Field>
    </Modal>
  )
}
