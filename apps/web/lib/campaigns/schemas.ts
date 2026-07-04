import { z } from 'zod'

/**
 * Zod mirror of `services/api/app/modules/campaigns/domain/models.py::ContentSource`.
 * Keep enum values in sync with the backend Postgres enum.
 */
export const contentSourceSchema = z.enum(['llm', 'edited', 'manual'])
export type ContentSource = z.infer<typeof contentSourceSchema>

/** Zod mirror of `domain/models.py::Priority`. */
export const prioritySchema = z.enum(['high', 'medium', 'low'])
export type Priority = z.infer<typeof prioritySchema>

/** An NPC proposed by the Scribe during extraction — mirrors `schemas.py::ExtractedNPC`. */
export const extractedNpcSchema = z.object({
  name: z.string(),
  description: z.string(),
  current_state: z.string(),
  motivation: z.string(),
  content_source: contentSourceSchema.default('llm'),
})
export type ExtractedNpc = z.infer<typeof extractedNpcSchema>

/** A faction proposed by the Scribe — mirrors `schemas.py::ExtractedFaction`. */
export const extractedFactionSchema = z.object({
  name: z.string(),
  description: z.string(),
  current_stance: z.string(),
  goals: z.string(),
  content_source: contentSourceSchema.default('llm'),
})
export type ExtractedFaction = z.infer<typeof extractedFactionSchema>

/**
 * An arc proposed by the Scribe — mirrors `schemas.py::ExtractedArc`.
 * No `status` field: arc status is assigned on persistence, never proposed.
 */
export const extractedArcSchema = z.object({
  title: z.string(),
  description: z.string(),
  priority: prioritySchema.default('medium'),
  content_source: contentSourceSchema.default('llm'),
})
export type ExtractedArc = z.infer<typeof extractedArcSchema>

/**
 * `POST /campaigns/extract` response body — mirrors `schemas.py::ExtractCampaignOutput`.
 */
export const extractCampaignOutputSchema = z.object({
  title: z.string(),
  description: z.string(),
  world_state: z.string(),
  npcs: z.array(extractedNpcSchema).default([]),
  factions: z.array(extractedFactionSchema).default([]),
  arcs: z.array(extractedArcSchema).default([]),
})
export type ExtractCampaignOutput = z.infer<typeof extractCampaignOutputSchema>

/**
 * `POST /campaigns/extract` request body — the backend trust boundary
 * (mirrors `schemas.py::ExtractRequest`, `Field(min_length=100, max_length=8000)`).
 */
export const extractRequestSchema = z.object({
  raw_text: z
    .string()
    .min(100, 'Premise must be at least 100 characters')
    .max(8000, 'Premise must be at most 8000 characters'),
})
export type ExtractRequest = z.infer<typeof extractRequestSchema>

/** An NPC in a reviewed `POST /campaigns` payload — mirrors `schemas.py::CreateNpcRequest`. */
export const createNpcRequestSchema = z.object({
  name: z.string(),
  description: z.string(),
  current_state: z.string(),
  motivation: z.string(),
  content_source: contentSourceSchema,
})
export type CreateNpcRequest = z.infer<typeof createNpcRequestSchema>

/** A faction in a reviewed payload — mirrors `schemas.py::CreateFactionRequest`. */
export const createFactionRequestSchema = z.object({
  name: z.string(),
  description: z.string(),
  current_stance: z.string(),
  goals: z.string(),
  content_source: contentSourceSchema,
})
export type CreateFactionRequest = z.infer<typeof createFactionRequestSchema>

/**
 * An arc in a reviewed payload — mirrors `schemas.py::CreateArcRequest`.
 * No `status` field accepted from the client — status is always assigned
 * server-side (`"open"`).
 */
export const createArcRequestSchema = z.object({
  title: z.string(),
  description: z.string(),
  priority: prioritySchema.default('medium'),
  content_source: contentSourceSchema,
})
export type CreateArcRequest = z.infer<typeof createArcRequestSchema>

/** `POST /campaigns` request body — mirrors `schemas.py::CreateCampaignRequest`. */
export const createCampaignRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  world_state: z.string().min(1),
  npcs: z.array(createNpcRequestSchema).default([]),
  factions: z.array(createFactionRequestSchema).default([]),
  arcs: z.array(createArcRequestSchema).default([]),
})
export type CreateCampaignRequest = z.infer<typeof createCampaignRequestSchema>

/** `POST /campaigns` success response body — mirrors `schemas.py::CreateCampaignResponse`. */
export const createCampaignResponseSchema = z.object({
  id: z.string(),
})
export type CreateCampaignResponse = z.infer<
  typeof createCampaignResponseSchema
>
