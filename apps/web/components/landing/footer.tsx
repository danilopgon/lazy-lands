import Link from 'next/link'

/**
 * Site footer — brand mark, copyright, and navigation links.
 *
 * @returns {React.ReactElement} The footer element.
 */
export function LandFooter() {
  return (
    <footer
      className="border-t-2 border-[var(--border)] px-5 py-[30px] llg:px-10"
      style={{ background: 'var(--paper-2)' }}
    >
      <div className="mx-auto flex max-w-[1420px] flex-col gap-4 llg:flex-row llg:items-center llg:justify-between">
        <div className="flex items-center gap-4">
          <span className="font-serif text-[18px] font-semibold">
            Lazy <span style={{ color: 'var(--accent-deep)' }}>Lands</span>
          </span>
          <span className="font-mono text-[10.5px] text-[var(--ink-2)]">
            © 2026 · made by a DM tired of forgetting
          </span>
        </div>

        <nav
          aria-label="Footer"
          className="flex flex-wrap gap-4 font-mono uppercase tracking-[0.06em] text-[var(--ink-2)] llg:gap-[18px]"
          style={{ fontSize: 10.5 }}
        >
          <Link href="#product" className="hover:text-[var(--ink)]">
            Product
          </Link>
          <Link href="#how" className="hover:text-[var(--ink)]">
            How it works
          </Link>
          <Link href="#early-access" className="hover:text-[var(--ink)]">
            Early access
          </Link>
          <Link href="/privacy" className="hover:text-[var(--ink)]">
            Privacy
          </Link>
          <Link href="/cookies" className="hover:text-[var(--ink)]">
            Cookies
          </Link>
        </nav>
      </div>
    </footer>
  )
}
