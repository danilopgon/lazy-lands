'use client'

import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'

import { LoadingScribe } from '@/components/ui/loading-scribe'
import { Notice } from '@/components/ui/notice'
import { CampaignDetailView } from '@/components/campaigns/campaign-detail-view'
import { getCampaignDetail, CampaignNotFoundError } from '@/lib/campaigns/api'

/**
 * Campaign detail page — fetches and displays a single campaign with its children.
 *
 * @returns {React.ReactElement} The campaign detail page element.
 */
export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>()
  const t = useTranslations('Campaigns')
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['campaign', params.id],
    queryFn: () => getCampaignDetail(params.id),
  })

  if (isLoading) {
    return (
      <main id="main-content" className="mx-auto max-w-[1100px] px-6 py-16">
        <LoadingScribe
          title={t('screen.loadingTitle')}
          caption={t('screen.openingChronicle')}
        />
      </main>
    )
  }

  if (error) {
    const isNotFound = error instanceof CampaignNotFoundError

    return (
      <main id="main-content" className="mx-auto max-w-[1100px] px-6 py-16">
        <Notice variant="error">
          <p>{isNotFound ? t('screen.notFound') : t('screen.loadError')}</p>
          <button
            type="button"
            className="mt-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] underline"
            onClick={() => refetch()}
          >
            {t('screen.retry')}
          </button>
        </Notice>
      </main>
    )
  }

  if (!data) {
    return null
  }

  return (
    <main id="main-content" className="mx-auto max-w-[1100px] px-6 py-16">
      <CampaignDetailView campaign={data} />
    </main>
  )
}
