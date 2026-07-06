'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { LoadingScribe } from '@/components/ui/loading-scribe'
import { Notice } from '@/components/ui/notice'
import { CampaignList } from '@/components/campaigns/campaign-list'
import { getCampaigns } from '@/lib/campaigns/api'
import { getClientUiMessages } from '@/lib/i18n/ui-copy'

/**
 * Campaign dashboard — fetches and displays the authenticated user's campaigns.
 *
 * @returns {React.ReactElement} The dashboard page element.
 */
export default function DashboardPage() {
  const router = useRouter()
  const copy = getClientUiMessages().Dashboard
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['campaigns'],
    queryFn: getCampaigns,
  })

  return (
    <main id="main-content" className="mx-auto max-w-[900px] px-6 py-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
            {copy.kicker}
          </p>
          <h1 className="mt-2 font-serif text-[38px] font-semibold tracking-[-0.03em] text-[var(--ink)]">
            {copy.title}
          </h1>
          {!isLoading && (
            <p className="mt-1 text-sm text-[var(--ink-2)]">
              {error
                ? copy.errorSummary
                : data && data.length > 0
                  ? (data.length === 1
                      ? copy.countOne
                      : copy.countOther
                    ).replace('{count}', String(data.length))
                  : copy.empty}
            </p>
          )}
        </div>
        {!isLoading && (
          <div className="flex items-center gap-3">
            <LanguageSwitcher compact />
            <Button variant="ink" onClick={() => router.push('/campaigns/new')}>
              {copy.newCampaign}
            </Button>
          </div>
        )}
      </div>

      {isLoading && (
        <LoadingScribe
          className="mt-8"
          title={copy.loadingTitle}
          caption={copy.loadingCaption}
        />
      )}

      {error && (
        <Notice className="mt-7" variant="error">
          <p>{copy.errorBody}</p>
          <button
            type="button"
            className="mt-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] underline"
            onClick={() => refetch()}
          >
            {copy.retry}
          </button>
        </Notice>
      )}

      {!isLoading && !error && data && <CampaignList campaigns={data} />}
    </main>
  )
}
