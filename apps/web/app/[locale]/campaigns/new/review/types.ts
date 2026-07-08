import type { ContentSource } from '@/lib/campaigns/schemas'

/** Common shape shared by NPC/faction/arc review items. */
export type ReviewItem = Record<string, string> & {
  reviewId: string
  content_source: ContentSource
}

/** Declarative field descriptor rendered by `EntitySection` rows and forms. */
export type EntityField<T extends ReviewItem> = {
  key: keyof T & string
  label: string
  placeholder: string
  /** Render a multi-line textarea instead of a single-line input (long prose). */
  multiline?: boolean
}
