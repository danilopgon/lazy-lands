'use client'

import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'

import { useRouter } from '@/i18n/navigation'
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
  const t = useTranslations('Dashboard')
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['campaigns'],
    queryFn: getCampaigns,
  })

  return (
    <main
      id="main-content"
      className="ll-workspace mx-auto max-w-[900px] px-6 py-16"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
            {t('kicker')}
          </p>
          <h1 className="mt-2 font-serif text-[38px] font-semibold tracking-[-0.03em] text-[var(--ink)]">
            {t('title')}
          </h1>
          {!isLoading && (
            <p className="mt-1 text-sm text-[var(--ink-2)]">
              {error
                ? t('errorSummary')
                : data && data.length > 0
                  ? t('count', { count: data.length })
                  : t('empty')}
            </p>
          )}
        </div>
        {!isLoading && (
          <Button variant="ink" onClick={() => router.push('/campaigns/new')}>
            {t('newCampaign')}
          </Button>
        )}
      </div>

      {isLoading && (
        <LoadingScribe
          className="mt-8"
          title={t('loadingTitle')}
          caption={t('loadingCaption')}
        />
      )}

      {error && (
        <Notice className="mt-7" variant="error">
          <p>{t('errorBody')}</p>
          <button
            type="button"
            className="mt-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] underline"
            onClick={() => refetch()}
          >
            {t('retry')}
          </button>
        </Notice>
      )}

      {!isLoading && !error && data && <CampaignList campaigns={data} />}
    </main>
  )
}
