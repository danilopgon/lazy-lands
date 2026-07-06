'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Notice } from '@/components/ui/notice'
import { CampaignApiError } from '@/lib/campaigns/api'

type ConfirmDeleteModalProps = {
  /** What is being deleted, e.g. "NPC" — used in the title. */
  entityLabel: string
  /** The name/title of the specific item, shown in the prompt. */
  itemName: string
  /** Performs the delete; rejects to keep the modal open with an error. */
  onConfirm: () => Promise<void>
  onClose: () => void
}

/**
 * Confirmation modal for a destructive delete. Runs `onConfirm`; on failure the
 * modal stays open and shows the error. Shared by NPC/faction/arc lists.
 *
 * @param {object} root0 - The confirm-delete props.
 * @param {string} root0.entityLabel - The entity kind (e.g. "NPC").
 * @param {string} root0.itemName - The specific item's name/title.
 * @param {() => Promise<void>} root0.onConfirm - The delete action.
 * @param {() => void} root0.onClose - Close the modal.
 * @returns {React.ReactElement} The confirm-delete modal element.
 */
export function ConfirmDeleteModal({
  entityLabel,
  itemName,
  onConfirm,
  onClose,
}: ConfirmDeleteModalProps) {
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirm = async () => {
    setError(null)
    setIsDeleting(true)
    try {
      await onConfirm()
    } catch (err: unknown) {
      setIsDeleting(false)
      setError(
        err instanceof CampaignApiError
          ? err.message
          : `Could not delete this ${entityLabel.toLowerCase()}. Please try again.`
      )
    }
  }

  return (
    <Modal
      title={`Delete ${entityLabel}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="ink-inverted"
            disabled={isDeleting}
            onClick={handleConfirm}
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </Button>
        </>
      }
    >
      {error ? (
        <Notice className="mb-3" variant="error">
          <p>{error}</p>
        </Notice>
      ) : null}
      <p className="text-sm leading-relaxed text-[var(--ink-2)]">
        Delete <b className="text-[var(--ink)]">{itemName}</b>? This cannot be
        undone.
      </p>
    </Modal>
  )
}
