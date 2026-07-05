'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { LoadingScribe } from '@/components/ui/loading-scribe'
import { Notice } from '@/components/ui/notice'
import { CampaignList } from '@/components/campaigns/campaign-list'
import { getCampaigns } from '@/lib/campaigns/api'

/**
 * Campaign dashboard — fetches and displays the authenticated user's campaigns.
 *
 * @returns {React.ReactElement} The dashboard page element.
 */
export default function DashboardPage() {
  const router = useRouter()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['campaigns'],
    queryFn: getCampaigns,
  })

  return (
    <main id="main-content" className="mx-auto max-w-[900px] px-6 py-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
            Campaigns
          </p>
          <h1 className="mt-2 font-serif text-[38px] font-semibold tracking-[-0.03em] text-[var(--ink)]">
            Your chronicles
          </h1>
          {!isLoading && (
            <p className="mt-1 text-sm text-[var(--ink-2)]">
              {error
                ? 'Something went wrong'
                : data && data.length > 0
                  ? `${data.length} campaigns`
                  : 'No campaigns yet'}
            </p>
          )}
        </div>
        {!isLoading && (
          <Button variant="ink" onClick={() => router.push('/campaigns/new')}>
            + New campaign
          </Button>
        )}
      </div>

      {isLoading && (
        <LoadingScribe
          className="mt-8"
          title="The Scribe is writing"
          caption="Fetching your campaigns"
        />
      )}

      {error && (
        <Notice className="mt-7" variant="error">
          <p>Something went wrong while loading your campaigns.</p>
          <button
            type="button"
            className="mt-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] underline"
            onClick={() => refetch()}
          >
            Retry
          </button>
        </Notice>
      )}

      {!isLoading && !error && data && <CampaignList campaigns={data} />}
    </main>
  )
}
