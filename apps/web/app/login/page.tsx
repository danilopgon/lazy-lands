import Link from 'next/link'

export default function LoginPage() {
  return (
    <main id="main-content" className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
        Access
      </p>
      <h1 className="mt-3 font-serif text-5xl font-semibold tracking-[-0.03em]">
        Login
      </h1>
      <p className="mt-4 max-w-xl text-[var(--ink-2)]">
        Authentication arrives in the next implementation block. This
        placeholder keeps the entry route smoke-testable.
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
