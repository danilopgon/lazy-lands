import Link from 'next/link'

import { Button } from '@/components/ui/button'

export function LandingPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8 sm:px-10">
      <header className="flex items-center justify-between border-b-[3px] border-[var(--line-strong)] pb-4">
        <Link
          className="font-serif text-2xl font-semibold tracking-[-0.02em]"
          href="/"
        >
          Lazy <span className="text-[var(--accent)]">Lands</span>
        </Link>
        <nav aria-label="Account" className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild variant="accent" size="sm">
            <Link href="/register">Start</Link>
          </Button>
        </nav>
      </header>

      <section className="grid gap-10 py-16 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-24">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
            Campaign Companion for Dungeon Masters
          </p>
          <h1 className="mt-5 max-w-3xl font-serif text-6xl font-semibold leading-[0.94] tracking-[-0.04em] sm:text-7xl">
            Lazy Lands
          </h1>
          <p className="mt-6 font-serif text-3xl font-semibold leading-tight text-[var(--ink)]">
            Remember what happened. Prepare what comes next.
          </p>
          <p className="mt-6 max-w-2xl font-serif text-lg leading-8 text-[var(--ink-2)]">
            Lazy Lands keeps campaign context reviewable so every NPC, faction,
            open arc, and accepted memory can shape the next session without
            taking control away from the DM.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Button asChild variant="accent">
              <Link href="/register">Register</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/login">Login</Link>
            </Button>
          </div>
        </div>

        <aside
          className="border-2 border-[var(--border)] bg-[var(--paper)] p-6 shadow-[8px_8px_0_var(--shadow)]"
          aria-label="Product principles"
        >
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
            The Scribe proposes
          </p>
          <h2 className="mt-3 font-serif text-3xl font-semibold leading-none">
            The DM decides what becomes canon.
          </h2>
          <div className="mt-6 space-y-4 border-t-2 border-[var(--ink)] pt-5">
            {[
              'Capture session context',
              'Review suggested memories',
              'Generate editable prep',
            ].map((item, index) => (
              <div
                key={item}
                className="flex gap-4 border-b border-dashed border-[var(--dotted)] pb-4 last:border-b-0"
              >
                <span className="font-mono text-sm font-bold text-[var(--accent)]">
                  /{String(index + 1).padStart(2, '0')}
                </span>
                <span className="font-serif text-xl">{item}</span>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  )
}
