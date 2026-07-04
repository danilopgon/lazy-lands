'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { extractCampaign, CampaignApiError } from '@/lib/campaigns/api'
import { saveExtractionDraft } from '@/lib/campaigns/draft-storage'
import {
  extractRequestSchema,
  type ExtractRequest,
} from '@/lib/campaigns/schemas'

const MAX_PREMISE_LENGTH = 8000

/**
 * `/campaigns/new` — the DM's free-text premise form (CUI-001).
 *
 * Submits the premise to `POST /campaigns/extract`; on success the
 * extracted proposal is stashed client-side (sessionStorage — there is no
 * server-side draft, NFR-CUI-2) and the DM is routed to the review screen.
 *
 * @returns {React.ReactElement} The new-campaign premise form.
 */
export default function NewCampaignPage() {
  const router = useRouter()
  const [extractError, setExtractError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ExtractRequest>({
    resolver: zodResolver(extractRequestSchema),
    defaultValues: { raw_text: '' },
  })
  const rawText = watch('raw_text') ?? ''

  const mutation = useMutation({
    mutationFn: (text: string) => extractCampaign(text),
    onSuccess: (payload) => {
      saveExtractionDraft(payload)
      router.push('/campaigns/new/review')
    },
    onError: (err: unknown) => {
      setExtractError(
        err instanceof CampaignApiError
          ? err.message
          : 'Unable to analyze that premise right now. Please try again.'
      )
    },
  })

  /**
   * Handle validated form submission — calls the extract mutation.
   *
   * @param {ExtractRequest} data - The validated form data.
   */
  function onSubmit(data: ExtractRequest) {
    setExtractError(null)
    mutation.mutate(data.raw_text)
  }

  const isSubmitting = mutation.isPending

  return (
    <main id="main-content" className="mx-auto max-w-[720px] px-6 py-16">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
        New campaign
      </p>
      <h1 className="mt-3 font-serif text-4xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
        Tell the Scribe your premise
      </h1>
      <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-[var(--ink-2)]">
        Describe your world, tone, and starting hook in free text. The Scribe
        will propose NPCs, factions, and arcs for you to review.
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 space-y-3"
        noValidate
      >
        <div className="flex items-baseline justify-between">
          <Label htmlFor="raw_text">Premise</Label>
          <span
            className="font-mono text-xs text-[var(--ink-3)]"
            aria-live="polite"
          >
            {rawText.length} / {MAX_PREMISE_LENGTH}
          </span>
        </div>
        <Textarea
          id="raw_text"
          rows={10}
          {...register('raw_text')}
          disabled={isSubmitting}
        />
        {errors.raw_text && (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {errors.raw_text.message}
          </p>
        )}
        {extractError && (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {extractError}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Analyzing...' : 'Analyze'}
        </Button>
      </form>
    </main>
  )
}
