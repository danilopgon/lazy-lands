import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import en from '@/messages/en.json'
import es from '@/messages/es.json'

// The legal pages are async Server Components using `getTranslations`, which is
// server-only and throws under vitest's client environment. Back it with
// next-intl's real `createTranslator` so `t`/`t.rich` behave faithfully; the
// resolved element is then rendered directly (no provider needed).
vi.mock('next-intl/server', async () => {
  const { createTranslator } = await import('next-intl')
  return {
    getTranslations: async ({
      locale,
      namespace,
    }: {
      locale: string
      namespace: string
    }) =>
      createTranslator({
        locale,
        messages: (locale === 'es' ? es : en) as never,
        namespace: namespace as never,
      }),
  }
})

/** Fresh route props for an English render. */
const enProps = () => ({ params: Promise.resolve({ locale: 'en' }) })

// ─────────────────────────────────────────────────────────────────
// /cookies page — LEGAL-001
// ─────────────────────────────────────────────────────────────────
describe('/cookies page (LEGAL-001)', () => {
  it('LEGAL-001b: generateMetadata returns robots noindex', async () => {
    const { generateMetadata } = await import('@/app/[locale]/cookies/page')
    const metadata = await generateMetadata(enProps())
    expect((metadata as { robots?: { index?: boolean } }).robots?.index).toBe(
      false
    )
  })

  it('LEGAL-001a: renders <h1>Cookie Policy</h1>', async () => {
    const { default: CookiesPage } = await import('@/app/[locale]/cookies/page')
    render(await CookiesPage(enProps()))
    expect(
      screen.getByRole('heading', { level: 1, name: /cookie policy/i })
    ).toBeInTheDocument()
  })

  it('LEGAL-001c: documents the actual Supabase auth storage key pattern and local keys', async () => {
    const { default: CookiesPage } = await import('@/app/[locale]/cookies/page')
    render(await CookiesPage(enProps()))
    expect(screen.getByText(/sb-<project-ref>-auth-token/i)).toBeInTheDocument()
    expect(screen.getByText(/ll-cookie-consent/i)).toBeInTheDocument()
    expect(screen.getByText(/ll-announcement-dismissed/i)).toBeInTheDocument()
  })

  it('does not document legacy split Supabase token keys that this app does not configure', async () => {
    const { default: CookiesPage } = await import('@/app/[locale]/cookies/page')
    render(await CookiesPage(enProps()))
    expect(screen.queryByText(/sb-access-token/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/sb-refresh-token/i)).not.toBeInTheDocument()
  })

  it('LEGAL-001d: contains back-link to landing (/)', async () => {
    const { default: CookiesPage } = await import('@/app/[locale]/cookies/page')
    render(await CookiesPage(enProps()))
    const backLink = screen.getByRole('link', {
      name: /back to home|back to landing|← back|return/i,
    })
    expect(backLink).toHaveAttribute('href', '/')
  })

  it('LEGAL-001e: mentions LSSI-CE technical exemption', async () => {
    const { default: CookiesPage } = await import('@/app/[locale]/cookies/page')
    render(await CookiesPage(enProps()))
    const elements = screen.getAllByText(
      /lssi-ce|art\. 22\.2|technical.{1,30}exemption/i
    )
    expect(elements.length).toBeGreaterThan(0)
  })

  it('LEGAL-001f: Spanish metadata title is localized', async () => {
    const { generateMetadata } = await import('@/app/[locale]/cookies/page')
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'es' }),
    })
    expect((metadata as { title?: string }).title).toBe('Cookies · Lazy Lands')
  })
})

// ─────────────────────────────────────────────────────────────────
// /privacy page — LEGAL-002
// ─────────────────────────────────────────────────────────────────
describe('/privacy page (LEGAL-002)', () => {
  it('LEGAL-002b: generateMetadata returns robots noindex', async () => {
    const { generateMetadata } = await import('@/app/[locale]/privacy/page')
    const metadata = await generateMetadata(enProps())
    expect((metadata as { robots?: { index?: boolean } }).robots?.index).toBe(
      false
    )
  })

  it('LEGAL-002a: renders <h1>Privacy Policy</h1>', async () => {
    const { default: PrivacyPage } = await import('@/app/[locale]/privacy/page')
    render(await PrivacyPage(enProps()))
    expect(
      screen.getByRole('heading', { level: 1, name: /privacy policy/i })
    ).toBeInTheDocument()
  })

  it('LEGAL-002c: uses pending legal-safe controller copy', async () => {
    const { default: PrivacyPage } = await import('@/app/[locale]/privacy/page')
    render(await PrivacyPage(enProps()))
    expect(
      screen.getByText(/legal data controller is pending final legal review/i)
    ).toBeInTheDocument()
  })

  it('LEGAL-002d: does not invent a legal contact channel', async () => {
    const { default: PrivacyPage } = await import('@/app/[locale]/privacy/page')
    const { container } = render(await PrivacyPage(enProps()))
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull()
    expect(screen.queryByText(/@.*\.(com|org|net|io)/i)).toBeNull()
    expect(screen.getByText(/privacy@lazylands\.app/i)).toBeInTheDocument()
  })

  it('LEGAL-002e: mentions GDPR art. 6.1.b legal basis', async () => {
    const { default: PrivacyPage } = await import('@/app/[locale]/privacy/page')
    render(await PrivacyPage(enProps()))
    const elements = screen.getAllByText(/gdpr|art\. 6\.1\.b|6\.1\(b\)/i)
    expect(elements.length).toBeGreaterThan(0)
  })

  it('LEGAL-002f: enumerates user rights', async () => {
    const { default: PrivacyPage } = await import('@/app/[locale]/privacy/page')
    render(await PrivacyPage(enProps()))
    const elements = screen.getAllByText(
      /access|rectif|erasure|portab|objection/i
    )
    expect(elements.length).toBeGreaterThan(0)
  })

  it('LEGAL-002g: contains back-link to landing (/)', async () => {
    const { default: PrivacyPage } = await import('@/app/[locale]/privacy/page')
    render(await PrivacyPage(enProps()))
    const backLink = screen.getByRole('link', {
      name: /back to home|back to landing|← back|return/i,
    })
    expect(backLink).toHaveAttribute('href', '/')
  })
})
