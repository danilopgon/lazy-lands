import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'

export const metadata: Metadata = {
  title: 'Cookies — Lazy Lands',
  robots: {
    index: false,
    follow: false,
  },
}

/**
 * Cookie policy page — non-indexed, lists all storage items in use.
 *
 * @returns {React.ReactElement} The cookie policy page element.
 */
export default function CookiesPage() {
  return (
    <main id="main-content" className="mx-auto max-w-2xl px-6 py-16 font-serif">
      <Link
        href="/"
        className="font-mono text-xs uppercase tracking-widest text-[var(--ink-2)] hover:text-[var(--accent)]"
      >
        ← Return to home
      </Link>

      <h1 className="mt-8 font-serif text-4xl font-semibold leading-tight text-[var(--ink)]">
        Cookie Policy
      </h1>

      <p className="mt-2 font-mono text-xs text-[var(--mute)]">
        Last updated: June 2026
      </p>

      <section className="mt-10 space-y-6 text-[var(--ink-2)]">
        <p>
          Lazy Lands uses only technically necessary cookies and local storage
          keys. We do not use advertising cookies, tracking pixels, or
          third-party analytics scripts. Supabase authentication uses its
          default project-scoped storage key because this app does not configure
          a custom Supabase auth storage name.
        </p>

        <h2 className="font-serif text-2xl font-semibold text-[var(--ink)]">
          Technical Exemption — LSSI-CE Art. 22.2
        </h2>
        <p>
          Under LSSI-CE Art. 22.2 (Ley de Servicios de la Sociedad de la
          Información y de Comercio Electrónico, art. 22.2) and its European
          equivalents, technically necessary cookies that are strictly required
          to provide a requested service do not require prior consent. All
          storage items listed below fall under this technical exemption.
        </p>

        <h2 className="font-serif text-2xl font-semibold text-[var(--ink)]">
          Storage Items in Use
        </h2>

        <div className="space-y-4 border-l-2 border-[var(--line)] pl-4">
          <div>
            <p className="font-mono text-sm font-semibold text-[var(--ink)]">
              sb-&lt;project-ref&gt;-auth-token
            </p>
            <p className="mt-1 text-sm">
              Supabase authentication session storage used by the default{' '}
              <code className="font-mono text-xs">@supabase/ssr</code> clients
              in this app. The project reference comes from the configured
              Supabase URL, for example{' '}
              <code className="font-mono text-xs">
                sb-abcdefghijklmnopqrst-auth-token
              </code>
              . It contains the Supabase session payload required for login
              continuity and authenticated requests; it is cleared on logout.
            </p>
          </div>

          <div>
            <p className="font-mono text-sm font-semibold text-[var(--ink)]">
              ll-cookie-consent
            </p>
            <p className="mt-1 text-sm">
              Records whether you have acknowledged this cookie notice. Stored
              in <code className="font-mono text-xs">localStorage</code>. Value:{' '}
              <code className="font-mono text-xs">
                &quot;acknowledged&quot;
              </code>
              . Persistent.
            </p>
          </div>

          <div>
            <p className="font-mono text-sm font-semibold text-[var(--ink)]">
              ll-announcement-dismissed
            </p>
            <p className="mt-1 text-sm">
              Records whether you have dismissed the site-wide announcement bar.
              Stored in <code className="font-mono text-xs">localStorage</code>.
              Value:{' '}
              <code className="font-mono text-xs">&quot;dismissed&quot;</code>.
              Persistent.
            </p>
          </div>
        </div>

        <h2 className="font-serif text-2xl font-semibold text-[var(--ink)]">
          No Third-Party Tracking
        </h2>
        <p>
          Lazy Lands does not load any advertising networks, social media
          pixels, or analytics platforms that set their own cookies. No data is
          shared with third parties for marketing purposes.
        </p>

        <h2 className="font-serif text-2xl font-semibold text-[var(--ink)]">
          Contact
        </h2>
        <p>
          Questions about this policy? Contact us at{' '}
          <a
            href="mailto:contacto@danilopgon.com"
            className="text-[var(--accent)]"
          >
            contacto@danilopgon.com
          </a>
          .
        </p>
      </section>
    </main>
  )
}
