import { z } from 'zod'

// Mirrors services/api/app/modules/sessions/api/schemas/session/requests.py
// `RegisterSessionRequest` — summary required, consequences optional,
// session_number is server-assigned (never sent by the client).
export const registerSessionRequestSchema = z.object({
  summary: z.string().trim().min(1).max(8000),
  consequences: z.string().trim().max(8000).optional(),
})
export type RegisterSessionRequest = z.infer<
  typeof registerSessionRequestSchema
>

// Mirrors services/api/app/modules/sessions/domain/enums.py `Importance`.
export const importanceSchema = z.enum(['high', 'medium', 'low'])
export type Importance = z.infer<typeof importanceSchema>

// Mirrors `MemoryType` in services/api/app/modules/sessions/domain/enums.py.
// The finite Scribe vocabulary for memory suggestions; the response read
// model stays lenient (z.string()) so legacy DB rows are never rejected by
// the frontend either.
export const memoryTypeSchema = z.enum([
  'consequence',
  'relationship',
  'secret',
  'promise',
  'tension',
  'revelation',
  'item',
  'arc_progress',
])
export type MemoryType = z.infer<typeof memoryTypeSchema>

// Mirrors `MemorySuggestion` in application/contracts.py — transient, never
// persisted by this endpoint. 7a has no UI consumer for these; 7b does.
export const memorySuggestionSchema = z.object({
  content: z.string(),
  type: memoryTypeSchema,
  importance: importanceSchema,
  reason: z.string(),
  related: z.array(z.string()),
})
export type MemorySuggestion = z.infer<typeof memorySuggestionSchema>

// Mirrors `RegisterSessionResponse` — `POST /campaigns/{id}/sessions` body.
export const registerSessionResponseSchema = z.object({
  session_id: z.string(),
  session_number: z.number(),
  memory_suggestions: z.array(memorySuggestionSchema),
})
export type RegisterSessionResponse = z.infer<
  typeof registerSessionResponseSchema
>

// Mirrors `SessionResponse` read model — one row of `GET /campaigns/{id}/sessions`.
export const sessionResponseSchema = z.object({
  id: z.string(),
  session_number: z.number(),
  summary: z.string().nullable(),
  consequences: z.string().nullable(),
  has_generated_content: z.boolean().default(false),
  created_at: z.string().nullable(),
})
export type SessionResponse = z.infer<typeof sessionResponseSchema>

const optionalTrimmedNullableString = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()
  .optional()

export const generateSessionRequestSchema = z.object({
  goal: optionalTrimmedNullableString,
  tone: z.string().trim().default('Keep current, low-magic intrigue'),
  pace: z.string().trim().default('Balanced'),
  difficulty: z.string().trim().default('Standard'),
  additional_instructions: optionalTrimmedNullableString,
})
export type GenerateSessionRequest = z.infer<
  typeof generateSessionRequestSchema
>

export const continuityLinkSchema = z.object({
  memory_fact_id: z.string(),
  relevance: z.string(),
})
export type ContinuityLink = z.infer<typeof continuityLinkSchema>

export const generatedSectionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  body: z.string().min(1),
  origin: z.enum(['scribe', 'edited']),
})
export type GeneratedSection = z.infer<typeof generatedSectionSchema>

export const generatedContentSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    sections: z.array(generatedSectionSchema).min(1),
    continuity_links: z.array(continuityLinkSchema).optional(),
  })
  .passthrough()
export type GeneratedContent = z.infer<typeof generatedContentSchema>

// Mirrors `SectionId` in services/api/app/modules/sessions/domain/enums.py —
// the 7 canonical generated-session section ids, fixed order.
export const sectionIdSchema = z.enum([
  'synopsis',
  'goal',
  'opening',
  'beats',
  'encounters',
  'factions',
  'arcs',
])
export type SectionId = z.infer<typeof sectionIdSchema>

// `POST /sessions/{id}/regenerate-section` request body — no steering field
// exists here by design; the DM can only pick which section to regenerate.
export const regenerateSectionRequestSchema = z.object({
  section_id: sectionIdSchema,
})
export type RegenerateSectionRequest = z.infer<
  typeof regenerateSectionRequestSchema
>

export const generateSessionResponseSchema = z.object({
  id: z.string(),
  session_number: z.number(),
  title: z.string(),
  sections: z.array(generatedSectionSchema),
  continuity_links: z.array(continuityLinkSchema),
  trace_id: z.string(),
})
export type GenerateSessionResponse = z.infer<
  typeof generateSessionResponseSchema
>

export const sessionDetailSchema = z.object({
  id: z.string(),
  campaign_id: z.string(),
  session_number: z.number(),
  summary: z.string().nullable(),
  consequences: z.string().nullable(),
  generated_content: generatedContentSchema.nullable(),
  trace_json: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
})
export type SessionDetail = z.infer<typeof sessionDetailSchema>

export const updateSessionContentSchema = z
  .object({
    generated_content: generatedContentSchema.nullable().optional(),
    summary: z.string().nullable().optional(),
    consequences: z.string().nullable().optional(),
  })
  .refine(
    (value) =>
      value.generated_content !== undefined ||
      value.summary !== undefined ||
      value.consequences !== undefined,
    'At least one supported field is required'
  )
export type UpdateSessionContent = z.infer<typeof updateSessionContentSchema>
