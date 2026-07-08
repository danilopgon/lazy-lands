'use client'

import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'

import { Link } from '@/i18n/navigation'

import { LoadingScribe } from '@/components/ui/loading-scribe'
import { Notice } from '@/components/ui/notice'
import { LogSessionForm } from '@/components/sessions/log-session-form'
import { getCampaignDetail, CampaignNotFoundError } from '@/lib/campaigns/api'

/**
 * `/campaigns/:id/sessions/new` — the Log Session screen (handoff `LogSession`).
 *
 * Fetches the campaign only to resolve its title for the breadcrumb/kicker;
 * the form itself is a separate client component (`LogSessionForm`).
 *
 * @returns {React.ReactElement} The log-session page element.
 */
export default function LogSessionPage() {
  const params = useParams<{ id: string }>()
  const campaignId = params.id
  const t = useTranslations('Sessions')
  const tc = useTranslations('Campaigns')
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => getCampaignDetail(campaignId),
  })

  if (isLoading) {
    return (
      <main id="main-content" className="mx-auto max-w-[720px] px-6 py-16">
        <LoadingScribe
          title={tc('screen.loadingTitle')}
          caption={tc('screen.openingChronicle')}
        />
      </main>
    )
  }

  if (error) {
    const isNotFound = error instanceof CampaignNotFoundError

    return (
      <main id="main-content" className="mx-auto max-w-[720px] px-6 py-16">
        <Notice variant="error">
          <p>{isNotFound ? tc('screen.notFound') : tc('screen.loadError')}</p>
          <button
            type="button"
            className="mt-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] underline"
            onClick={() => refetch()}
          >
            {tc('screen.retry')}
          </button>
        </Notice>
      </main>
    )
  }

  if (!data) {
    return null
  }

  return (
    <main
      id="main-content"
      className="ll-view-enter mx-auto max-w-[720px] px-6 py-16"
    >
      <nav className="mb-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]">
        <Link href="/dashboard" className="hover:text-[var(--ink)]">
          {tc('breadcrumbRoot')}
        </Link>{' '}
        /{' '}
        <Link
          href={`/campaigns/${data.id}`}
          className="hover:text-[var(--ink)]"
        >
          {data.title}
        </Link>{' '}
        / <b className="text-[var(--ink)]">{t('breadcrumb')}</b>
      </nav>

      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
        {t('kicker')}
      </p>
      <h1 className="mt-3 font-serif text-[38px] font-semibold leading-[1.04] tracking-[-0.03em] text-[var(--ink)]">
        {t('title')}
      </h1>
      <p className="mt-4 max-w-[560px] text-base leading-relaxed text-[var(--ink-2)]">
        {t('subtitle')}
      </p>

      <div className="mt-8">
        <LogSessionForm campaignId={campaignId} />
      </div>
    </main>
  )
}
