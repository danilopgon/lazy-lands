'use client'

import { useRouter } from '@/i18n/navigation'
import { GeneratedSessionView } from '@/components/sessions/generated-session-view'
import { DEMO_GENERATED_SESSION_ID } from '@/lib/demo/fixtures'
import { demoHrefs } from '@/lib/demo/hrefs'
import { useDemoStore } from '@/lib/demo/store'

/**
 * `/demo/sessions/generated` — the generated session draft. Reuses the
 * production `GeneratedSessionView`, wired to the in-memory store for inline
 * edits and per-section regeneration; every action is local and every link
 * stays inside the demo island.
 *
 * @returns {React.ReactElement} The demo generated session page element.
 */
export default function DemoGeneratedSessionPage() {
  const store = useDemoStore()
  const router = useRouter()
  const activeMemories = store.memoryFacts.filter(
    (fact) => fact.status === 'active'
  )

  return (
    <GeneratedSessionView
      campaignId={store.campaign.id}
      sessionId={DEMO_GENERATED_SESSION_ID}
      campaign={{ id: store.campaign.id, title: store.campaign.title }}
      session={store.generated}
      memories={activeMemories}
      updateSessionFn={(_sessionId, payload) => store.saveSession(payload)}
      regenerateSectionFn={(_sessionId, sectionId) =>
        store.regenerateSection(sectionId)
      }
      navigate={(href) => router.push(href)}
      dashboardHref={demoHrefs.campaign}
      campaignHref={demoHrefs.campaign}
      exportHref={demoHrefs.export}
    />
  )
}
