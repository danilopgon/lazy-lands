import { z } from 'zod'

import { contentSourceSchema, prioritySchema } from './enums'

/** An NPC in a reviewed `POST /campaigns` payload. */
export const createNpcRequestSchema = z.object({
  name: z.string(),
  description: z.string(),
  current_state: z.string(),
  motivation: z.string(),
  content_source: contentSourceSchema,
})
export type CreateNpcRequest = z.infer<typeof createNpcRequestSchema>

/** A faction in a reviewed payload. */
export const createFactionRequestSchema = z.object({
  name: z.string(),
  description: z.string(),
  current_stance: z.string(),
  goals: z.string(),
  content_source: contentSourceSchema,
})
export type CreateFactionRequest = z.infer<typeof createFactionRequestSchema>

/** An arc in a reviewed payload. No `status` field is accepted. */
export const createArcRequestSchema = z.object({
  title: z.string(),
  description: z.string(),
  priority: prioritySchema.default('medium'),
  content_source: contentSourceSchema,
})
export type CreateArcRequest = z.infer<typeof createArcRequestSchema>

/** `POST /campaigns` request body. */
export const createCampaignRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  world_state: z.string().min(1),
  npcs: z.array(createNpcRequestSchema).default([]),
  factions: z.array(createFactionRequestSchema).default([]),
  arcs: z.array(createArcRequestSchema).default([]),
})
export type CreateCampaignRequest = z.infer<typeof createCampaignRequestSchema>

/** `POST /campaigns` success response body. */
export const createCampaignResponseSchema = z.object({
  id: z.string(),
})
export type CreateCampaignResponse = z.infer<
  typeof createCampaignResponseSchema
>
