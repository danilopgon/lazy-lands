'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Notice } from '@/components/ui/notice'
import { updateCampaign, CampaignApiError } from '@/lib/campaigns/api'

type WorldStateEditorProps = {
  campaignId: string
  initialValue: string | null
}

/**
 * World state inline editor — view/edit toggle wired to `PATCH /campaigns/{id}`.
 *
 * Save persists via the `updateCampaign` mutation and invalidates the campaign
 * detail query; on error the textarea stays open with the unsaved draft intact
 * and an inline error shows (design §5.3, campaign-view spec save-error state).
 *
 * @param {object} root0 - The world state editor props.
 * @param {string} root0.campaignId - The campaign whose world state is edited.
 * @param {string | null} root0.initialValue - The initial world state text.
 * @returns {React.ReactElement} The world state editor element.
 */
export function WorldStateEditor({
  campaignId,
  initialValue,
}: WorldStateEditorProps) {
  const t = useTranslations('Campaigns')
  const te = useTranslations('Entities')
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(initialValue ?? '')
  const [displayValue, setDisplayValue] = useState(initialValue ?? '')
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const mutation = useMutation({
    mutationFn: (world_state: string) =>
      updateCampaign(campaignId, { world_state }),
    onSuccess: (result) => {
      setDisplayValue(result.world_state ?? '')
      setIsEditing(false)
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] })
    },
    onError: (err: unknown) => {
      setError(
        err instanceof CampaignApiError
          ? err.message
          : t('worldState.saveError')
      )
    },
  })

  const handleEdit = () => {
    setDraft(displayValue)
    setError(null)
    setIsEditing(true)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const handleSave = () => {
    setError(null)
    mutation.mutate(draft)
  }

  const handleCancel = () => {
    setDraft(displayValue)
    setError(null)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div>
        {error ? (
          <Notice className="mb-2" variant="error">
            <p>{error}</p>
          </Notice>
        ) : null}
        <Textarea
          ref={textareaRef}
          rows={5}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
        />
        <div className="mt-2 flex gap-2">
          <Button
            size="sm"
            variant="accent"
            onClick={handleSave}
            disabled={
              mutation.isPending || !draft.trim() || draft === displayValue
            }
          >
            {mutation.isPending ? te('saving') : te('saveChanges')}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleCancel}
            disabled={mutation.isPending}
          >
            {te('cancel')}
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
            {t('worldState.empty')}
          </span>
        )}
      </p>
      <button
        type="button"
        className="mt-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)] hover:underline"
        onClick={handleEdit}
      >
        {te('edit')}
      </button>
    </div>
  )
}
