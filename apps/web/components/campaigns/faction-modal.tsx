'use client'

import { useState } from 'react'
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

type FactionModalProps = {
  campaignId: string
  /** The faction to edit, or null to create a new one. */
  faction: FactionResponse | null
  onClose: () => void
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
 * @returns {React.ReactElement} The faction modal element.
 */
export function FactionModal({
  campaignId,
  faction,
  onClose,
}: FactionModalProps) {
  const isEdit = faction !== null
  const queryClient = useQueryClient()
  const [name, setName] = useState(faction?.name ?? '')
  const [description, setDescription] = useState(faction?.description ?? '')
  const [currentStance, setCurrentStance] = useState(
    faction?.current_stance ?? ''
  )
  const [goals, setGoals] = useState(faction?.goals ?? '')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => {
      // Empty optionals sent as null so an edit can clear a set value.
      const fields = {
        name: name.trim(),
        description: description.trim() || null,
        current_stance: currentStance.trim() || null,
        goals: goals.trim() || null,
      }
      return isEdit
        ? updateFaction(faction.id, fields)
        : createFaction({ campaign_id: campaignId, ...fields })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] })
      onClose()
    },
    onError: (err: unknown) => {
      setError(
        err instanceof CampaignApiError
          ? err.message
          : 'Could not save this faction. Please try again.'
      )
    },
  })

  return (
    <Modal
      title={isEdit ? 'Edit faction' : 'New faction'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
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
              ? 'Saving…'
              : isEdit
                ? 'Save changes'
                : 'Add faction'}
          </Button>
        </>
      }
    >
      {error ? (
        <Notice className="mb-3" variant="error">
          <p>{error}</p>
        </Notice>
      ) : null}
      <Field label="Name">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Description">
        <Textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <Field label="Current stance">
        <Input
          value={currentStance}
          onChange={(e) => setCurrentStance(e.target.value)}
        />
      </Field>
      <Field label="Objective">
        <Input value={goals} onChange={(e) => setGoals(e.target.value)} />
      </Field>
    </Modal>
  )
}
