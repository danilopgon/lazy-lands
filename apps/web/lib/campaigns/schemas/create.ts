import { z } from 'zod'

import { contentSourceSchema, prioritySchema } from './enums'

// Bounds mirror the backend `POST /campaigns` contract (services/api …
// campaigns/schemas.py) so oversized fields fail inline on the review screen
// instead of only being rejected by the server on save.
const NAME_MAX = 200
const LONG_TEXT_MAX = 4000
const SHORT_TEXT_MAX = 1000
const ENTITY_LIST_MAX = 100

/** An NPC in a reviewed `POST /campaigns` payload. */
export const createNpcRequestSchema = z.object({
  name: z.string().min(1).max(NAME_MAX),
  description: z.string().min(1).max(LONG_TEXT_MAX),
  current_state: z.string().min(1).max(SHORT_TEXT_MAX),
  motivation: z.string().min(1).max(SHORT_TEXT_MAX),
  content_source: contentSourceSchema,
})
export type CreateNpcRequest = z.infer<typeof createNpcRequestSchema>

/** A faction in a reviewed payload. */
export const createFactionRequestSchema = z.object({
  name: z.string().min(1).max(NAME_MAX),
  description: z.string().min(1).max(LONG_TEXT_MAX),
  current_stance: z.string().min(1).max(SHORT_TEXT_MAX),
  goals: z.string().min(1).max(SHORT_TEXT_MAX),
  content_source: contentSourceSchema,
})
export type CreateFactionRequest = z.infer<typeof createFactionRequestSchema>

/** An arc in a reviewed payload. No `status` field is accepted. */
export const createArcRequestSchema = z.object({
  title: z.string().min(1).max(NAME_MAX),
  description: z.string().min(1).max(LONG_TEXT_MAX),
  priority: prioritySchema.default('medium'),
  content_source: contentSourceSchema,
})
export type CreateArcRequest = z.infer<typeof createArcRequestSchema>

/** `POST /campaigns` request body. */
export const createCampaignRequestSchema = z.object({
  title: z.string().min(1).max(NAME_MAX),
  description: z.string().min(1).max(LONG_TEXT_MAX),
  world_state: z.string().min(1).max(LONG_TEXT_MAX),
  system: z.string().min(1).max(NAME_MAX),
  tone: z.string().max(NAME_MAX).nullish(),
  npcs: z.array(createNpcRequestSchema).max(ENTITY_LIST_MAX).default([]),
  factions: z
    .array(createFactionRequestSchema)
    .max(ENTITY_LIST_MAX)
    .default([]),
  arcs: z.array(createArcRequestSchema).max(ENTITY_LIST_MAX).default([]),
})
export type CreateCampaignRequest = z.infer<typeof createCampaignRequestSchema>

/** `POST /campaigns` success response body. */
export const createCampaignResponseSchema = z.object({
  id: z.string(),
})
export type CreateCampaignResponse = z.infer<
  typeof createCampaignResponseSchema
>
