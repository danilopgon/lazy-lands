import { notFound } from 'next/navigation'

import CampaignDetailPage from '@/app/[locale]/campaigns/[id]/page'
import MemoryReviewPage from '@/app/[locale]/campaigns/[id]/memory/review/page'
import { GeneratedSessionView } from '@/components/sessions/generated-session-view'

type VisualRegressionHostProps = {
  params: Promise<{ id: string; view: string }>
}

const visualRegressionViews = new Set([
  'campaign-detail',
  'generated-session',
  'memory-review',
])

/**
 * Provides a test-only composition host for the production campaign views.
 * It is unavailable unless Playwright explicitly enables visual test mode.
 *
 * @param {VisualRegressionHostProps} root0 - Route parameters for the test host.
 * @param {Promise<{id: string; view: string}>} root0.params - Requested fixture and view.
 * @returns {Promise<React.ReactElement>} The requested production view composition.
 */
export default async function VisualRegressionHost({
  params,
}: VisualRegressionHostProps) {
  const { id, view } = await params

  if (
    process.env.VISUAL_REGRESSION_TEST_MODE !== 'true' ||
    !visualRegressionViews.has(view)
  ) {
    notFound()
  }

  if (view === 'campaign-detail') {
    return <CampaignDetailPage />
  }

  if (view === 'generated-session') {
    return <GeneratedSessionView campaignId={id} sessionId="visual-session" />
  }

  return <MemoryReviewPage />
}
