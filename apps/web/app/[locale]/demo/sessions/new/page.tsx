'use client'

import { useTranslations } from 'next-intl'

import { useRouter } from '@/i18n/navigation'
import { DemoBreadcrumb } from '@/components/demo/demo-breadcrumb'
import { LogSessionForm } from '@/components/sessions/log-session-form'
import { demoHrefs } from '@/lib/demo/hrefs'
import { useDemoStore } from '@/lib/demo/store'

/**
 * `/demo/sessions/new` — the Log Session screen. Reuses the production
 * `LogSessionForm`, injecting the demo store's local register action and a
 * navigation that lands on the demo memory-review screen. No draft is written
 * to storage; the store carries the resulting suggestions.
 *
 * @returns {React.ReactElement} The demo log-session page element.
 */
export default function DemoLogSessionPage() {
  const t = useTranslations('Sessions')
  const store = useDemoStore()
  const router = useRouter()

  return (
    <main
      id="main-content"
      className="ll-view-enter mx-auto max-w-[720px] px-6 py-16"
    >
      <DemoBreadcrumb title={t('breadcrumb')} />

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
        <LogSessionForm
          campaignId={store.campaign.id}
          registerSessionFn={(_campaignId, payload) =>
            store.logSession(payload)
          }
          completeSessionFn={(sessionId, payload) =>
            store.completeSession(sessionId, payload)
          }
          getSessionsFn={async () => store.sessions}
          persistDraft={false}
          navigate={() => router.push(demoHrefs.memory)}
        />
      </div>
    </main>
  )
}
