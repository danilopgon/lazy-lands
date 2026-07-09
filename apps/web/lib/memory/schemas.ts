import { z } from 'zod'

export const importanceSchema = z.enum(['high', 'medium', 'low'])
export type Importance = z.infer<typeof importanceSchema>

export const memoryStatusSchema = z.enum(['active', 'archived'])
export type MemoryStatus = z.infer<typeof memoryStatusSchema>

export const createMemoryFactRequestSchema = z.object({
  source_session_id: z.string().optional(),
  content: z.string().trim().min(1).max(2000),
  type: z.string().trim().min(1).max(100).optional(),
  importance: importanceSchema.optional(),
})
export type CreateMemoryFactRequest = z.infer<
  typeof createMemoryFactRequestSchema
>

export const updateMemoryFactRequestSchema = z
  .object({
    content: z.string().trim().min(1).max(2000).optional(),
    status: memoryStatusSchema.optional(),
  })
  .refine((value) => value.content !== undefined || value.status !== undefined)
export type UpdateMemoryFactRequest = z.infer<
  typeof updateMemoryFactRequestSchema
>

export const memoryFactResponseSchema = z.object({
  id: z.string(),
  campaign_id: z.string(),
  source_session_id: z.string().nullable().optional(),
  content: z.string(),
  type: z.string().nullable().optional(),
  importance: importanceSchema.nullable().optional(),
  status: memoryStatusSchema,
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
})
export type MemoryFactResponse = z.infer<typeof memoryFactResponseSchema>
