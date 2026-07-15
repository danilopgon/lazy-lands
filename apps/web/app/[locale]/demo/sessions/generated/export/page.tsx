'use client'

import { useRouter } from '@/i18n/navigation'
import { SessionExportView } from '@/components/sessions/session-export-view'
import { DEMO_GENERATED_SESSION_ID } from '@/lib/demo/fixtures'
import { demoHrefs } from '@/lib/demo/hrefs'
import { useDemoStore } from '@/lib/demo/store'

/** Simulated export latency so the reused loading state renders. */
const DEMO_EXPORT_MS = 700

/**
 * `/demo/sessions/generated/export` — the PDF export screen. Reuses the
 * production `SessionExportView`; the download is simulated locally (no file is
 * fetched or written) and simply resolves with a filename so the success state
 * shows.
 *
 * @returns {React.ReactElement} The demo export page element.
 */
export default function DemoExportPage() {
  const store = useDemoStore()
  const router = useRouter()

  return (
    <SessionExportView
      campaignId={store.campaign.id}
      sessionId={DEMO_GENERATED_SESSION_ID}
      campaign={{ id: store.campaign.id, title: store.campaign.title }}
      session={store.generated}
      downloadFn={() =>
        new Promise((resolve) =>
          setTimeout(
            () => resolve('shadows-over-phandalin-session-8.pdf'),
            DEMO_EXPORT_MS
          )
        )
      }
      navigate={(href) => router.push(href)}
      dashboardHref={demoHrefs.campaign}
      campaignHref={demoHrefs.campaign}
      draftHref={demoHrefs.generated}
    />
  )
}
