'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import Link from 'next/link'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LoadingScribe } from '@/components/ui/loading-scribe'
import { Notice } from '@/components/ui/notice'
import { extractCampaign, CampaignApiError } from '@/lib/campaigns/api'
import { saveExtractionDraft } from '@/lib/campaigns/draft-storage'
import {
  MAX_CAMPAIGN_PREMISE_LENGTH,
  MIN_CAMPAIGN_PREMISE_LENGTH,
  extractRequestSchema,
} from '@/lib/campaigns/schemas'

/** The fields `composeRawText` folds into the single `raw_text` payload. */
type ComposableCampaign = {
  name: string
  system: string
  tone?: string
  raw_text: string
  additional_details?: string
}

/**
 * Fold the DM's name/system/tone/context/details into the single `raw_text`
 * the extraction endpoint receives. Exported for the golden-fold regression
 * test (Block 6 WU3 §8.2): threading system/tone onto the persisted campaign
 * must NOT change this fold.
 *
 * @param {ComposableCampaign} data - The new-campaign form fields.
 * @returns {string} The folded `raw_text`.
 */
export function composeRawText(data: ComposableCampaign): string {
  return [
    data.name.trim() ? `Campaign name: ${data.name}` : null,
    data.system.trim() ? `Game system: ${data.system}` : null,
    data.tone?.trim() ? `Tone or style: ${data.tone}` : null,
    `Starting context:\n${data.raw_text}`,
    data.additional_details?.trim()
      ? `Additional details for the Scribe:\n${data.additional_details}`
      : null,
  ]
    .filter(Boolean)
    .join('\n\n')
}

const campaignFormSchema = extractRequestSchema
  .extend({
    name: z.string().trim().min(1, 'Give your campaign a name.'),
    system: z.string().trim().min(1, "Name the game system you're running."),
    tone: z.string().optional(),
    additional_details: z.string().optional(),
  })
  // The composed payload — not raw_text alone — is what the backend receives
  // and bounds at MAX_CAMPAIGN_PREMISE_LENGTH. Validate the total so a long
  // name/tone/details field can't slip past the per-field checks.
  .superRefine((data, ctx) => {
    const composedLength = composeRawText(data).length
    if (composedLength > MAX_CAMPAIGN_PREMISE_LENGTH) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['raw_text'],
        message: `Your notes total ${composedLength} characters — trim them under ${MAX_CAMPAIGN_PREMISE_LENGTH} so the Scribe can hold them.`,
      })
    }
  })
type CampaignFormValues = z.infer<typeof campaignFormSchema>

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
  const [isExtracting, setIsExtracting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    getValues,
    formState: { errors },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: '',
      system: '',
      tone: '',
      raw_text: '',
      additional_details: '',
    },
  })
  const rawText = watch('raw_text') ?? ''

  const mutation = useMutation({
    mutationFn: (text: string) => extractCampaign(text),
    onSuccess: (payload) => {
      saveExtractionDraft(payload, {
        system: getValues('system'),
        tone: getValues('tone'),
      })
      router.push('/campaigns/new/review')
    },
    onError: (err: unknown) => {
      setIsExtracting(false)
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
   * @param {CampaignFormValues} data - The validated form data.
   */
  function onSubmit(data: CampaignFormValues) {
    setExtractError(null)
    setIsExtracting(true)
    mutation.mutate(composeRawText(data))
  }

  // While the Scribe extracts, replace the whole form with the quill loading
  // takeover — the animation is what covers the AI "thinking" latency, and a
  // static disabled form reads as if the page had frozen.
  if (isExtracting) {
    return (
      <main id="main-content" className="mx-auto max-w-[720px] px-6 py-16">
        <LoadingScribe
          title="Reading your world"
          caption="The Scribe is drafting NPCs, factions, world state and open arcs from your notes"
        />
      </main>
    )
  }

  const isSubmitting = isExtracting || mutation.isPending

  return (
    <main id="main-content" className="mx-auto max-w-[720px] px-6 py-16">
      <nav className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-2)]">
        <Link className="hover:text-[var(--accent-deep)]" href="/dashboard">
          Campaigns
        </Link>{' '}
        / <span className="text-[var(--ink)]">New campaign</span>
      </nav>
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
        Step 1 of 2 · Pour your world in
      </p>
      <h1 className="mt-3 font-serif text-[38px] font-semibold leading-[1.04] tracking-[-0.03em] text-[var(--ink)]">
        Start a new chronicle
      </h1>
      <p className="mt-4 max-w-[560px] text-base leading-relaxed text-[var(--ink-2)]">
        Paste your campaign notes however they exist today. The Scribe will
        draft the pieces; you&apos;ll review and edit everything before anything
        is saved.
      </p>

      {extractError && (
        <Notice className="mt-6" variant="error" ornament="⚠" role="alert">
          {extractError}
        </Notice>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 border-2 border-[var(--border)] bg-[var(--paper)] p-6 shadow-[6px_6px_0_var(--shadow)]"
        noValidate
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label
              className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em]"
              htmlFor="name"
            >
              Campaign name
            </Label>
            <Input
              id="name"
              placeholder="The Salt Road"
              disabled={isSubmitting}
              {...register('name')}
            />
            {errors.name && (
              <p
                role="alert"
                className="font-mono text-xs text-[var(--danger)]"
              >
                {errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label
              className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em]"
              htmlFor="system"
            >
              Game system
            </Label>
            <Input
              id="system"
              placeholder="D&D 5e, Pathfinder, …"
              disabled={isSubmitting}
              {...register('system')}
            />
            {errors.system && (
              <p
                role="alert"
                className="font-mono text-xs text-[var(--danger)]"
              >
                {errors.system.message}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Label
            className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em]"
            htmlFor="tone"
          >
            Tone or style{' '}
            <span className="text-[var(--ink-3)]">· optional</span>
          </Label>
          <Input
            id="tone"
            placeholder="Grim survival, high adventure, political intrigue…"
            disabled={isSubmitting}
            {...register('tone')}
          />
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-baseline justify-between gap-4">
            <Label
              className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em]"
              htmlFor="raw_text"
            >
              Starting context / Premise
            </Label>
            <span
              className={`font-mono text-xs ${
                rawText.trim().length >= MIN_CAMPAIGN_PREMISE_LENGTH
                  ? 'text-[var(--accent-deep)]'
                  : errors.raw_text
                    ? 'text-[var(--danger)]'
                    : 'text-[var(--ink-3)]'
              }`}
              aria-live="polite"
            >
              {rawText.trim().length} / {MIN_CAMPAIGN_PREMISE_LENGTH} characters
              minimum · {rawText.length} / {MAX_CAMPAIGN_PREMISE_LENGTH}
            </span>
          </div>
          <Textarea
            id="raw_text"
            rows={9}
            placeholder="Phandalin is a frontier mining town. A young white dragon named Cryovain hunts the Sword Mountains. The Black Bear Guild smuggles through the warehouse district, and plans for an anti-dragon weapon have just been stolen…"
            {...register('raw_text')}
            disabled={isSubmitting}
          />
          {errors.raw_text && (
            <p role="alert" className="font-mono text-xs text-[var(--danger)]">
              {errors.raw_text.message}
            </p>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <Label
            className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em]"
            htmlFor="additional_details"
          >
            Additional details for the Scribe{' '}
            <span className="text-[var(--ink-3)]">· optional</span>
          </Label>
          <Textarea
            id="additional_details"
            rows={3}
            placeholder="The party is four PCs: a paladin, two rogues and a wizard. Keep magic rare."
            disabled={isSubmitting}
            {...register('additional_details')}
          />
          <p className="text-xs text-[var(--ink-3)]">
            House rules, things to ignore, party names: anything that shapes the
            extraction.
          </p>
        </div>
        <div className="mt-6 flex items-center justify-between gap-4">
          <span className="font-mono text-[11px] text-[var(--ink-3)]">
            Your text stays here if the Scribe cannot parse it.
          </span>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Analyzing...' : 'Analyze campaign →'}
          </Button>
        </div>
      </form>
    </main>
  )
}
