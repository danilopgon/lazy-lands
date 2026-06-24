import Link from 'next/link'

export default function RegisterPage() {
  return (
    <main id="main-content" className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
        Start
      </p>
      <h1 className="mt-3 font-serif text-5xl font-semibold tracking-[-0.03em]">
        Register
      </h1>
      <p className="mt-4 max-w-xl text-[var(--ink-2)]">
        Account creation is intentionally deferred. The route exists so the
        Block 0 frontend has stable navigation targets.
      </p>
      <Link
        className="mt-8 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[var(--accent-deep)]"
        href="/"
      >
        Back to landing
      </Link>
    </main>
  )
}
