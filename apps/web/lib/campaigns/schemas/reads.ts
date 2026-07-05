import { z } from 'zod'

import { contentSourceSchema, prioritySchema } from './enums'

// Mirrors the Postgres `arc_status` enum and `ArcStatus` domain value object
// (`services/api/app/modules/campaigns/domain/enums.py`). Only `open` arcs are
// active narrative threads; `resolved`/`dropped` are terminal. See
// docs/03-domain-model.md §Arc.
export const arcStatusSchema = z.enum(['open', 'resolved', 'dropped'])
export type ArcStatus = z.infer<typeof arcStatusSchema>

export const npcResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  current_state: z.string().nullable(),
  motivation: z.string().nullable(),
  content_source: contentSourceSchema.nullable(),
})
export type NpcResponse = z.infer<typeof npcResponseSchema>

export const factionResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  current_stance: z.string().nullable(),
  goals: z.string().nullable(),
  content_source: contentSourceSchema.nullable(),
})
export type FactionResponse = z.infer<typeof factionResponseSchema>

export const arcResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  priority: prioritySchema.nullable(),
  status: arcStatusSchema.nullable(),
  content_source: contentSourceSchema.nullable(),
})
export type ArcResponse = z.infer<typeof arcResponseSchema>

export const campaignSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  system: z.string().nullable(),
  tone: z.string().nullable(),
  updated_at: z.string(),
  npc_count: z.number(),
  faction_count: z.number(),
  arc_count: z.number(),
})
export type CampaignSummary = z.infer<typeof campaignSummarySchema>

export const campaignDetailResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  world_state: z.string().nullable(),
  system: z.string().nullable(),
  tone: z.string().nullable(),
  updated_at: z.string(),
  npcs: z.array(npcResponseSchema),
  factions: z.array(factionResponseSchema),
  arcs: z.array(arcResponseSchema),
})
export type CampaignDetailResponse = z.infer<
  typeof campaignDetailResponseSchema
>
