'use client'

import type { ReactNode } from 'react'
import { NavLink } from '@/components/navigation/nav-link'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { LoadingScribe } from '@/components/ui/loading-scribe'
import { Notice } from '@/components/ui/notice'
import { getCampaignDetail, CampaignNotFoundError } from '@/lib/campaigns/api'

import type { CampaignDetailResponse } from '@/lib/campaigns/schemas'

type EntityListScreenProps = {
  /** Mono kicker above the title, e.g. "Campaign · NPCs". */
  kicker: string
  /** Screen title and last breadcrumb segment, e.g. "NPCs". */
  title: string
  /** Label for the primary "+ New …" action (wired to a modal in Work Unit 3). */
  addLabel: string
  /** Builds the count subtitle from the loaded campaign. */
  subtitle: (campaign: CampaignDetailResponse) => string
  /** Invoked when the primary "+ New …" action is pressed. */
  onAdd?: () => void
  /** Renders the entity rows from the loaded campaign. */
  children: (campaign: CampaignDetailResponse) => ReactNode
}

/**
 * Shared scaffold for the read-only entity list screens (NPCs, Factions, Arcs).
 *
 * Owns the campaign-detail fetch and its loading/error/not-found states, the
 * breadcrumb, and the header; delegates row rendering to `children`. The
 * entity collections all arrive inside the single `GET /campaigns/{id}` detail
 * payload, so every entity screen slices from the same query.
 *
 * @param {object} root0 - The entity list screen props.
 * @param {string} root0.kicker - Mono kicker above the title.
 * @param {string} root0.title - Screen title and last breadcrumb segment.
 * @param {string} root0.addLabel - Label for the primary add action.
 * @param {(campaign: CampaignDetailResponse) => string} root0.subtitle - Builds the count subtitle.
 * @param {() => void} [root0.onAdd] - Invoked when the primary add action is pressed.
 * @param {(campaign: CampaignDetailResponse) => React.ReactNode} root0.children - Renders the entity rows.
 * @returns {React.ReactElement} The entity list screen element.
 */
export function EntityListScreen({
  kicker,
  title,
  addLabel,
  subtitle,
  onAdd,
  children,
}: EntityListScreenProps) {
  const params = useParams<{ id: string }>()
  const t = useTranslations('Campaigns')
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['campaign', params.id],
    queryFn: () => getCampaignDetail(params.id),
  })

  if (isLoading) {
    return (
      <main
        id="main-content"
        className="ll-workspace mx-auto max-w-[1100px] px-6 py-16"
      >
        <LoadingScribe
          title={t('screen.loadingTitle')}
          caption={t('screen.opening', { title })}
        />
      </main>
    )
  }

  if (error) {
    const isNotFound = error instanceof CampaignNotFoundError
    return (
      <main
        id="main-content"
        className="ll-workspace mx-auto max-w-[1100px] px-6 py-16"
      >
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
    <main
      id="main-content"
      className="ll-view-enter ll-workspace mx-auto max-w-[1100px] px-6 py-16"
    >
      <nav className="mb-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]">
        <NavLink href="/dashboard" className="hover:text-[var(--ink)]">
          {t('breadcrumbRoot')}
        </NavLink>{' '}
        /{' '}
        <NavLink
          href={`/campaigns/${data.id}`}
          className="hover:text-[var(--ink)]"
        >
          {data.title}
        </NavLink>{' '}
        / <b className="text-[var(--ink)]">{title}</b>
      </nav>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
            {kicker}
          </p>
          <h1 className="mt-2 font-serif text-[38px] font-semibold tracking-[-0.03em] text-[var(--ink)]">
            {title}
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-2)]">{subtitle(data)}</p>
        </div>
        <Button variant="ink" onClick={onAdd}>
          {addLabel}
        </Button>
      </div>

      <div className="mt-6">{children(data)}</div>
    </main>
  )
}
