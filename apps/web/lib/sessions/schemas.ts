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

// Mirrors `MemorySuggestion` in application/contracts.py — transient, never
// persisted by this endpoint. 7a has no UI consumer for these; 7b does.
export const memorySuggestionSchema = z.object({
  content: z.string(),
  type: z.string(),
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
  created_at: z.string().nullable(),
})
export type SessionResponse = z.infer<typeof sessionResponseSchema>
