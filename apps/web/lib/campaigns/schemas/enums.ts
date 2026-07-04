import { z } from 'zod'

/** Zod mirror of backend ContentSource/Postgres enum. */
export const contentSourceSchema = z.enum(['llm', 'edited', 'manual'])
export type ContentSource = z.infer<typeof contentSourceSchema>

/** Zod mirror of backend Priority/Postgres enum. */
export const prioritySchema = z.enum(['high', 'medium', 'low'])
export type Priority = z.infer<typeof prioritySchema>
