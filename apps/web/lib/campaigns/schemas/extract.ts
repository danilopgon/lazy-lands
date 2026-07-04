import { z } from 'zod'

import {
  MAX_CAMPAIGN_PREMISE_LENGTH,
  MIN_CAMPAIGN_PREMISE_LENGTH,
} from './constants'
import { contentSourceSchema, prioritySchema } from './enums'

/** An NPC proposed by the Scribe during extraction. */
export const extractedNpcSchema = z.object({
  name: z.string(),
  description: z.string(),
  current_state: z.string(),
  motivation: z.string(),
  content_source: contentSourceSchema.default('llm'),
})
export type ExtractedNpc = z.infer<typeof extractedNpcSchema>

/** A faction proposed by the Scribe. */
export const extractedFactionSchema = z.object({
  name: z.string(),
  description: z.string(),
  current_stance: z.string(),
  goals: z.string(),
  content_source: contentSourceSchema.default('llm'),
})
export type ExtractedFaction = z.infer<typeof extractedFactionSchema>

/** An arc proposed by the Scribe. No `status` field is accepted. */
export const extractedArcSchema = z.object({
  title: z.string(),
  description: z.string(),
  priority: prioritySchema.default('medium'),
  content_source: contentSourceSchema.default('llm'),
})
export type ExtractedArc = z.infer<typeof extractedArcSchema>

/** `POST /campaigns/extract` response body. */
export const extractCampaignOutputSchema = z.object({
  title: z.string(),
  description: z.string(),
  world_state: z.string(),
  npcs: z.array(extractedNpcSchema).default([]),
  factions: z.array(extractedFactionSchema).default([]),
  arcs: z.array(extractedArcSchema).default([]),
})
export type ExtractCampaignOutput = z.infer<typeof extractCampaignOutputSchema>

/** `POST /campaigns/extract` request body. */
export const extractRequestSchema = z.object({
  raw_text: z
    .string()
    .min(
      MIN_CAMPAIGN_PREMISE_LENGTH,
      `Add at least ${MIN_CAMPAIGN_PREMISE_LENGTH} characters so the Scribe has something to work with.`
    )
    .max(
      MAX_CAMPAIGN_PREMISE_LENGTH,
      `Keep it under ${MAX_CAMPAIGN_PREMISE_LENGTH} characters so the Scribe doesn't lose the thread.`
    ),
})
export type ExtractRequest = z.infer<typeof extractRequestSchema>
