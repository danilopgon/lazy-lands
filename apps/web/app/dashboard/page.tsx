import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Notice } from '@/components/ui/notice'
import { StatLedger } from '@/components/ui/stat-ledger'

const emptyStats = [
  { value: '0', label: 'Campaigns' },
  { value: '0', label: 'Accepted memories' },
  { value: '0', label: 'Open arcs' },
]

export default function DashboardPage() {
  return (
    <main id="main-content" className="mx-auto max-w-[900px] px-6 py-16">
      <div className="border-b-[3px] border-[var(--line-strong)] pb-6">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
          Campaigns
        </p>
        <h1 className="mt-3 font-serif text-5xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
          Campaign dashboard
        </h1>
      </div>
      <StatLedger items={emptyStats} className="mt-8" />
      <EmptyState
        className="mt-8"
        title="No campaigns on the shelf yet"
        description="The MVP dashboard will list owned campaigns, recent sessions and memory counts after Supabase auth and campaign storage are wired."
        action={
          <Button asChild variant="secondary">
            <Link href="/">Back to landing</Link>
          </Button>
        }
      />
      <Notice className="mt-8" variant="plain" ornament="◆">
        Auth guards must be added before real campaign data appears here. Until
        then, this route is a Print Chronicle empty state for smoke tests.
      </Notice>
    </main>
  )
}
