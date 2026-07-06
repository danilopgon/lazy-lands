import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

// TDD RED phase — tests written before implementation.
// Covers LEGAL-001 (/cookies) and LEGAL-002 (/privacy).

// ─────────────────────────────────────────────────────────────────
// /cookies page — LEGAL-001
// ─────────────────────────────────────────────────────────────────
describe('/cookies page (LEGAL-001)', () => {
  it('LEGAL-001b: exports metadata with robots noindex', async () => {
    const { metadata } = await import('@/app/[locale]/cookies/page')
    expect((metadata as { robots?: { index?: boolean } }).robots?.index).toBe(
      false
    )
  })

  it('LEGAL-001a: renders <h1>Cookie Policy</h1>', async () => {
    const { default: CookiesPage } = await import('@/app/[locale]/cookies/page')
    render(<CookiesPage />)
    expect(
      screen.getByRole('heading', { level: 1, name: /cookie policy/i })
    ).toBeInTheDocument()
  })

  it('LEGAL-001c: documents the actual Supabase auth storage key pattern and local keys', async () => {
    const { default: CookiesPage } = await import('@/app/[locale]/cookies/page')
    render(<CookiesPage />)
    expect(screen.getByText(/sb-<project-ref>-auth-token/i)).toBeInTheDocument()
    expect(screen.getByText(/ll-cookie-consent/i)).toBeInTheDocument()
    expect(screen.getByText(/ll-announcement-dismissed/i)).toBeInTheDocument()
  })

  it('does not document legacy split Supabase token keys that this app does not configure', async () => {
    const { default: CookiesPage } = await import('@/app/[locale]/cookies/page')
    render(<CookiesPage />)
    expect(screen.queryByText(/sb-access-token/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/sb-refresh-token/i)).not.toBeInTheDocument()
  })

  it('LEGAL-001d: contains back-link to landing (/)', async () => {
    const { default: CookiesPage } = await import('@/app/[locale]/cookies/page')
    render(<CookiesPage />)
    const backLink = screen.getByRole('link', {
      name: /back to home|back to landing|← back|return/i,
    })
    expect(backLink).toHaveAttribute('href', '/')
  })

  it('LEGAL-001e: mentions LSSI-CE technical exemption', async () => {
    const { default: CookiesPage } = await import('@/app/[locale]/cookies/page')
    render(<CookiesPage />)
    const elements = screen.getAllByText(
      /lssi-ce|art\. 22\.2|technical.{1,30}exemption/i
    )
    expect(elements.length).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────────
// /privacy page — LEGAL-002
// ─────────────────────────────────────────────────────────────────
describe('/privacy page (LEGAL-002)', () => {
  it('LEGAL-002b: exports metadata with robots noindex', async () => {
    const { metadata } = await import('@/app/[locale]/privacy/page')
    expect((metadata as { robots?: { index?: boolean } }).robots?.index).toBe(
      false
    )
  })

  it('LEGAL-002a: renders <h1>Privacy Policy</h1>', async () => {
    const { default: PrivacyPage } = await import('@/app/[locale]/privacy/page')
    render(<PrivacyPage />)
    expect(
      screen.getByRole('heading', { level: 1, name: /privacy policy/i })
    ).toBeInTheDocument()
  })

  it('LEGAL-002c: uses pending legal-safe controller copy', async () => {
    const { default: PrivacyPage } = await import('@/app/[locale]/privacy/page')
    render(<PrivacyPage />)
    expect(
      screen.getByText(/legal data controller is pending final legal review/i)
    ).toBeInTheDocument()
  })

  it('LEGAL-002d: does not invent a legal contact channel', async () => {
    const { default: PrivacyPage } = await import('@/app/[locale]/privacy/page')
    const { container } = render(<PrivacyPage />)
    // Reject any email-like address or mailto link (not just the old placeholder)
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull()
    expect(screen.queryByText(/@.*\.(com|org|net|io)/i)).toBeNull()
    // Verify the pending-legal-review message remains present
    expect(screen.getByText(/privacy@lazylands\.app/i)).toBeInTheDocument()
  })

  it('LEGAL-002e: mentions GDPR art. 6.1.b legal basis', async () => {
    const { default: PrivacyPage } = await import('@/app/[locale]/privacy/page')
    render(<PrivacyPage />)
    const elements = screen.getAllByText(/gdpr|art\. 6\.1\.b|6\.1\(b\)/i)
    expect(elements.length).toBeGreaterThan(0)
  })

  it('LEGAL-002f: enumerates user rights', async () => {
    const { default: PrivacyPage } = await import('@/app/[locale]/privacy/page')
    render(<PrivacyPage />)
    // At least access, rectification, erasure must appear
    const elements = screen.getAllByText(
      /access|rectif|erasure|portab|objection/i
    )
    expect(elements.length).toBeGreaterThan(0)
  })

  it('LEGAL-002g: contains back-link to landing (/)', async () => {
    const { default: PrivacyPage } = await import('@/app/[locale]/privacy/page')
    render(<PrivacyPage />)
    const backLink = screen.getByRole('link', {
      name: /back to home|back to landing|← back|return/i,
    })
    expect(backLink).toHaveAttribute('href', '/')
  })
})
