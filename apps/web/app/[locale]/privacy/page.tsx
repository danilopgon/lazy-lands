import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — Lazy Lands',
  robots: {
    index: false,
    follow: false,
  },
}

/**
 * Privacy policy page — non-indexed placeholder until legal review is finalised.
 *
 * @returns {React.ReactElement} The privacy policy page element.
 */
export default function PrivacyPage() {
  return (
    <main id="main-content" className="mx-auto max-w-2xl px-6 py-16 font-serif">
      <Link
        href="/"
        className="font-mono text-xs uppercase tracking-widest text-[var(--ink-2)] hover:text-[var(--accent)]"
      >
        ← Return to home
      </Link>

      <h1 className="mt-8 font-serif text-4xl font-semibold leading-tight text-[var(--ink)]">
        Privacy Policy
      </h1>

      <p className="mt-2 font-mono text-xs text-[var(--mute)]">
        Last updated: June 2026
      </p>

      <section className="mt-10 space-y-8 text-[var(--ink-2)]">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-[var(--ink)]">
            Data Controller
          </h2>
          <p className="mt-2">
            The legal data controller is pending final legal review. Until a
            formal entity and contact channel are published, this page is a
            non-indexed implementation placeholder and should not be treated as
            final legal notice.
          </p>
        </div>

        <div>
          <h2 className="font-serif text-2xl font-semibold text-[var(--ink)]">
            Data We Collect
          </h2>
          <p className="mt-2">When you use Lazy Lands, we collect:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Email address</strong> — used for authentication and
              product communications.
            </li>
            <li>
              <strong>Campaign content</strong> — the notes, NPCs, factions,
              session logs, and other content you create inside the application.
              This data is yours and is only accessible to you.
            </li>
            <li>
              <strong>Authentication tokens</strong> — technical tokens
              (Supabase) stored in your browser to maintain your session.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-serif text-2xl font-semibold text-[var(--ink)]">
            Legal Basis
          </h2>
          <p className="mt-2">
            Processing is based on <strong>GDPR Art. 6.1.b</strong> — processing
            is necessary for the performance of a contract to which you are
            party (the Lazy Lands terms of service), or in order to take steps
            at your request prior to entering into a contract.
          </p>
        </div>

        <div>
          <h2 className="font-serif text-2xl font-semibold text-[var(--ink)]">
            Your Rights
          </h2>
          <p className="mt-2">
            Under GDPR, you have the following rights regarding your personal
            data:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Right of access</strong> — request a copy of the personal
              data we hold about you.
            </li>
            <li>
              <strong>Right to rectification</strong> — request correction of
              inaccurate data.
            </li>
            <li>
              <strong>Right to erasure</strong> — request deletion of your
              personal data (&quot;right to be forgotten&quot;).
            </li>
            <li>
              <strong>Right to portability</strong> — receive your data in a
              structured, machine-readable format.
            </li>
            <li>
              <strong>Right to object</strong> — object to processing based on
              legitimate interests.
            </li>
          </ul>
          <p className="mt-3">
            To exercise any of these rights before our formal contact channel is
            published, reach out via{' '}
            <strong className="font-mono text-sm text-[var(--ink)]">
              privacy@lazylands.app
            </strong>{' '}
            (temporary inbox, monitored during early access).
          </p>
        </div>

        <div>
          <h2 className="font-serif text-2xl font-semibold text-[var(--ink)]">
            Data Retention
          </h2>
          <p className="mt-2">
            We retain your data for as long as your account is active. Deleting
            your account removes all campaign data. Authentication logs are
            retained for up to 90 days for security purposes.
          </p>
        </div>

        <div>
          <h2 className="font-serif text-2xl font-semibold text-[var(--ink)]">
            No Third-Party Sharing
          </h2>
          <p className="mt-2">
            We do not sell, rent, or share your personal data with third parties
            for marketing purposes. We use Supabase (an infrastructure provider)
            to store and process data; they act as a data processor under a data
            processing agreement.
          </p>
        </div>
      </section>
    </main>
  )
}
