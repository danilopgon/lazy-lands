import type { MemoryFactResponse } from '@/lib/memory/schemas'
import type {
  regenerateSection,
  updateSessionContent,
} from '@/lib/sessions/api'
import type {
  GeneratedSection,
  SessionDetail,
  UpdateSessionContent,
} from '@/lib/sessions/schemas'

/** The subset of a campaign the generated-session header renders. */
export type GeneratedCampaign = { id: string; title: string }

/** Payload for either save path, carrying the sections it was built from. */
export type SaveMutationVariables = {
  nextSections: GeneratedSection[]
  payload: UpdateSessionContent
}

/** Props for the generated-session screen. */
export type GeneratedSessionViewProps = {
  campaignId: string
  sessionId: string
  campaign?: GeneratedCampaign
  session?: SessionDetail
  memories?: MemoryFactResponse[]
  updateSessionFn?: typeof updateSessionContent
  regenerateSectionFn?: typeof regenerateSection
  /** Navigation override for the header actions. Defaults to the localized router push. */
  navigate?: (href: string) => void
  /** Breadcrumb root href. Defaults to the authenticated dashboard. */
  dashboardHref?: string
  /** Breadcrumb + "back" campaign href. Defaults to the authenticated campaign detail. */
  campaignHref?: string
  /** "Export PDF" target. Defaults to the authenticated export route. */
  exportHref?: string
}
