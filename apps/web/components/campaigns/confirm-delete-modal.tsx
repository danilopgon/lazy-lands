'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Notice } from '@/components/ui/notice'
import { CampaignApiError } from '@/lib/campaigns/api'

type ConfirmDeleteModalProps = {
  /** Pre-formed modal title, e.g. "Delete NPC" (localized by the caller). */
  title: string
  /** Pre-formed fallback error, e.g. "Could not delete this NPC. …". */
  deleteError: string
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
 * @param {string} root0.title - The localized modal title (e.g. "Delete NPC").
 * @param {string} root0.deleteError - The localized fallback delete-error message.
 * @param {string} root0.itemName - The specific item's name/title.
 * @param {() => Promise<void>} root0.onConfirm - The delete action.
 * @param {() => void} root0.onClose - Close the modal.
 * @returns {React.ReactElement} The confirm-delete modal element.
 */
export function ConfirmDeleteModal({
  title,
  deleteError,
  itemName,
  onConfirm,
  onClose,
}: ConfirmDeleteModalProps) {
  const t = useTranslations('Entities')
  const tc = useTranslations('Campaigns')
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirm = async () => {
    setError(null)
    setIsDeleting(true)
    try {
      await onConfirm()
    } catch (err: unknown) {
      setIsDeleting(false)
      setError(err instanceof CampaignApiError ? err.message : deleteError)
    }
  }

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button
            variant="ink-inverted"
            disabled={isDeleting}
            onClick={handleConfirm}
          >
            {isDeleting ? t('deleting') : t('delete')}
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
        {tc.rich('confirmDelete.prompt', {
          name: itemName,
          b: (chunks) => <b className="text-[var(--ink)]">{chunks}</b>,
        })}
      </p>
    </Modal>
  )
}
