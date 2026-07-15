'use client'

import { useRouter } from '@/i18n/navigation'
import { PrepareSessionView } from '@/components/sessions/prepare-session-form'
import { demoHrefs } from '@/lib/demo/hrefs'
import { useDemoStore } from '@/lib/demo/store'

/**
 * `/demo/prepare` — the Prepare Next Session screen. Reuses the production
 * `PrepareSessionView`, injecting the demo campaign, the local generate action,
 * and demo-scoped navigation so generation lands on the demo draft.
 *
 * @returns {React.ReactElement} The demo prepare page element.
 */
export default function DemoPreparePage() {
  const store = useDemoStore()
  const router = useRouter()
  const nextNumber =
    store.sessions.reduce(
      (max, session) => Math.max(max, session.session_number),
      0
    ) + 1

  return (
    <PrepareSessionView
      campaignId={store.campaign.id}
      campaign={{
        id: store.campaign.id,
        title: store.campaign.title,
        sessionNumber: nextNumber,
      }}
      generateSessionFn={() => store.generateSession()}
      navigate={() => router.push(demoHrefs.generated)}
      dashboardHref={demoHrefs.campaign}
      campaignHref={demoHrefs.campaign}
    />
  )
}
