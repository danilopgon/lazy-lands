'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslations } from 'next-intl'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'

import { useRouter } from '@/i18n/navigation'

import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { LoadingScribe } from '@/components/ui/loading-scribe'
import { Notice } from '@/components/ui/notice'
import { registerSessionRequestSchema } from '@/lib/sessions/schemas'
import { registerSession } from '@/lib/sessions/api'
import { writeMemoryReviewDraft } from '@/lib/sessions/memory-review-draft'

import { z } from 'zod'

type LogSessionFormValues = {
  summary: string
  consequences?: string
}

type LogSessionFormProps = {
  campaignId: string
}

/**
 * `/campaigns/:id/sessions/new` form island — the two in-scope fields
 * (`summary` required, `consequences` optional). On success the DM is routed
 * to the campaign detail page; the 0-5 memory suggestions the backend
 * returns have no 7a UI consumer (7b consumes this exact response shape).
 *
 * @param {object} root0 - The log-session form props.
 * @param {string} root0.campaignId - The owning campaign's id.
 * @returns {React.ReactElement} The log-session form element.
 */
export function LogSessionForm({ campaignId }: LogSessionFormProps) {
  const t = useTranslations('Sessions')
  const te = useTranslations('Entities')
  const router = useRouter()
  const [hasSubmitError, setHasSubmitError] = useState(false)

  const formSchema = useMemo(
    () =>
      registerSessionRequestSchema.extend({
        summary: z.string().trim().min(1, t('summaryRequired')).max(8000),
      }),
    [t]
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LogSessionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { summary: '', consequences: '' },
  })

  const mutation = useMutation({
    mutationFn: (data: LogSessionFormValues) =>
      registerSession(campaignId, {
        summary: data.summary,
        consequences: data.consequences?.trim() ? data.consequences : undefined,
      }),
    onSuccess: (response) => {
      writeMemoryReviewDraft({
        campaign_id: campaignId,
        session_id: response.session_id,
        session_number: response.session_number,
        memory_suggestions: response.memory_suggestions,
      })
      router.push(
        `/campaigns/${campaignId}/memory/review?session=${response.session_id}`
      )
    },
    onError: () => {
      // The DM's exact typed text stays in the form (react-hook-form does not
      // reset on mutation error), so the copy is the fixed reassurance from
      // the handoff rather than the raw backend message — the point of this
      // state is "nothing was lost", not the failure's technical detail.
      setHasSubmitError(true)
    },
  })

  /**
   * Handle validated form submission — clears any prior error state and
   * fires the register-session mutation.
   *
   * @param {LogSessionFormValues} data - The validated form data.
   */
  function onSubmit(data: LogSessionFormValues) {
    setHasSubmitError(false)
    mutation.mutate(data)
  }

  // While saving, replace the whole form with the quill loading takeover —
  // the register + summarize + suggest round trip is synchronous on the
  // backend, so a static disabled form would read as a frozen page.
  if (mutation.isPending) {
    return (
      <LoadingScribe title={t('savingTitle')} caption={t('savingCaption')} />
    )
  }

  return (
    <>
      {hasSubmitError && (
        <Notice className="mb-5" variant="error" ornament="⚠" role="alert">
          {t('errorMessage')}
        </Notice>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="border-2 border-[var(--border)] bg-[var(--paper)] p-6 shadow-[6px_6px_0_var(--shadow)]"
        noValidate
      >
        <Field label={t('summaryLabel')} error={errors.summary?.message}>
          <Textarea
            id="summary"
            rows={7}
            placeholder={t('summaryPlaceholder')}
            {...register('summary')}
          />
        </Field>
        <div className="mt-4">
          <Field label={`${t('consequencesLabel')} · ${te('optional')}`}>
            <Textarea
              id="consequences"
              rows={3}
              placeholder={t('consequencesPlaceholder')}
              {...register('consequences')}
            />
          </Field>
        </div>
        <div className="mt-6 flex justify-end">
          <Button type="submit" variant="accent">
            {t('submit')}
          </Button>
        </div>
      </form>
    </>
  )
}
