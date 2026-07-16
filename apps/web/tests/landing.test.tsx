import { render, screen } from '@/tests/intl'
import { describe, it, expect, vi } from 'vitest'

import en from '@/messages/en.json'
import es from '@/messages/es.json'
import { LandingPage } from '@/components/landing/landing-page'

// `getTranslations` is a server-only API and throws under vitest's client
// environment, so back it with the real catalogs to exercise generateMetadata.
vi.mock('next-intl/server', () => ({
  getTranslations: async ({
    locale,
    namespace,
  }: {
    locale: string
    namespace: string
  }) => {
    const catalog = (locale === 'es' ? es : en) as Record<string, unknown>
    const scope = catalog[namespace] as Record<string, unknown>
    return (key: string) =>
      key
        .split('.')
        .reduce<unknown>(
          (node, part) => (node as Record<string, unknown>)?.[part],
          scope
        )
  },
}))

// TDD RED phase (task 3.1) — rewritten with new copy before implementation.
// Old assertions (Lazy Lands h1, "Remember what happened") removed.
// Covers: LAND-002, LAND-003, LAND-004, LAND-005, LAND-006, LAND-007, LAND-008,
//         LAND-009, LAND-010, LAND-013

describe('LandingPage', () => {
  // ─── LAND-003: Hero copy and CTAs ─────────────────────────────
  describe('Hero section (LAND-003)', () => {
    it('LAND-003a: H1 contains "Your campaign"', () => {
      render(<LandingPage />)
      expect(
        screen.getByRole('heading', { level: 1, name: /your campaign/i })
      ).toBeInTheDocument()
    })

    it('LAND-003b: H1 contains "without the amnesia"', () => {
      render(<LandingPage />)
      expect(
        screen.getByRole('heading', { level: 1, name: /without the amnesia/i })
      ).toBeInTheDocument()
    })

    it('LAND-003c: primary CTA links to /register', () => {
      render(<LandingPage />)
      const links = screen.getAllByRole('link', {
        name: /start your chronicle/i,
      })
      expect(links[0]).toHaveAttribute('href', '/register')
    })

    it('LAND-003d: secondary CTA links to /demo', () => {
      render(<LandingPage />)
      // There may be two demo CTAs (hero + final); find the hero one by text.
      const links = screen.getAllByRole('link', {
        name: /see it on a real campaign/i,
      })
      expect(links[0]).toHaveAttribute('href', '/demo')
    })

    it('LAND-003e: secondary CTA is an enabled link, not a disabled button', () => {
      render(<LandingPage />)
      const links = screen.getAllByRole('link', {
        name: /see it on a real campaign/i,
      })
      expect(links[0]).not.toHaveAttribute('aria-disabled')
    })
  })

  // ─── LAND-004: Marquee feature strings ────────────────────────
  describe('Marquee section (LAND-004)', () => {
    it('LAND-004a: renders all six feature strings', () => {
      render(<LandingPage />)
      // Items are duplicated for seamless loop, so use getAllByText
      expect(
        screen.getAllByText(/session vii accepted/i).length
      ).toBeGreaterThan(0)
      expect(
        screen.getAllByText(/open arc: anti-dragon plans/i).length
      ).toBeGreaterThan(0)
      expect(
        screen.getAllByText(/faction posture changed/i).length
      ).toBeGreaterThan(0)
      expect(
        screen.getAllByText(/scribe proposal waiting/i).length
      ).toBeGreaterThan(0)
      expect(
        screen.getAllByText(/private notes stay out/i).length
      ).toBeGreaterThan(0)
      expect(
        screen.getAllByText(/accepted memories only/i).length
      ).toBeGreaterThan(0)
    })
  })

  // ─── LAND-005: Pillars section ────────────────────────────────
  describe('Pillars section (LAND-005)', () => {
    it('LAND-005a: section has id="product"', () => {
      render(<LandingPage />)
      expect(document.getElementById('product')).toBeInTheDocument()
    })

    it('LAND-005b/c/d: renders the memory loop states', () => {
      render(<LandingPage />)
      expect(
        screen.getByText(/session vii: the warehouse fire/i)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/the scribe proposes memories/i)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/only accepted memory returns/i)
      ).toBeInTheDocument()
    })
  })

  // ─── LAND-006: Briefing section ───────────────────────────────
  describe('Briefing section (LAND-006)', () => {
    it('LAND-006a: H2 with briefing copy is present', () => {
      render(<LandingPage />)
      expect(
        screen.getByRole('heading', {
          name: /a briefing that reads like your own prep/i,
        })
      ).toBeInTheDocument()
    })

    it('LAND-006b: all four spec stat labels are present', () => {
      render(<LandingPage />)
      // Use getAllByText since "accepted" also appears in a badge; verify at least one stat label exists
      expect(screen.getAllByText(/^Accepted$/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/^Dismissed$/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/^Private$/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/^Editable$/i).length).toBeGreaterThan(0)
    })
  })

  // ─── LAND-007: How it works ───────────────────────────────────
  describe('How it works section (LAND-007)', () => {
    it('LAND-007a: section has id="how"', () => {
      render(<LandingPage />)
      expect(document.getElementById('how')).toBeInTheDocument()
    })

    it('LAND-007b: H2 "Three steps. Not one more." is present', () => {
      render(<LandingPage />)
      expect(
        screen.getByRole('heading', { name: /three steps\. not one more\./i })
      ).toBeInTheDocument()
    })

    it('LAND-007c: step titles are present', () => {
      render(<LandingPage />)
      expect(screen.getByText(/create your campaign/i)).toBeInTheDocument()
      expect(screen.getByText(/log each session/i)).toBeInTheDocument()
      expect(screen.getByText(/prepare the next/i)).toBeInTheDocument()
    })
  })

  // ─── LAND-008: Philosophy quote ───────────────────────────────
  describe('Philosophy section (LAND-008)', () => {
    it('LAND-008a: full quote text is present', () => {
      render(<LandingPage />)
      expect(
        screen.getByText(/The Scribe is a draft, never the author/i)
      ).toBeInTheDocument()
    })
  })

  // ─── LAND-009: CTA section ────────────────────────────────────
  describe('Final CTA section (LAND-009)', () => {
    it('LAND-009a: section has id="early-access"', () => {
      render(<LandingPage />)
      expect(document.getElementById('early-access')).toBeInTheDocument()
    })

    it('LAND-009b: H2 "Start your first chronicle." is present', () => {
      render(<LandingPage />)
      expect(
        screen.getByRole('heading', { name: /start your first chronicle/i })
      ).toBeInTheDocument()
    })

    it('LAND-009c: primary CTA links to /register', () => {
      render(<LandingPage />)
      const links = screen.getAllByRole('link', {
        name: /start your chronicle/i,
      })
      expect(links.at(-1)).toHaveAttribute('href', '/register')
    })

    it('LAND-009d: secondary CTA links to /demo', () => {
      render(<LandingPage />)
      const link = screen.getByRole('link', { name: /tour a demo campaign/i })
      expect(link).toHaveAttribute('href', '/demo')
    })
  })

  // ─── LAND-010: Footer ─────────────────────────────────────────
  describe('Footer (LAND-010)', () => {
    it('LAND-010a: <footer> element is present', () => {
      render(<LandingPage />)
      expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    })

    it('LAND-010b: link to /privacy is present', () => {
      render(<LandingPage />)
      expect(screen.getByRole('link', { name: /privacy/i })).toHaveAttribute(
        'href',
        '/privacy'
      )
    })

    it('LAND-010c: link to /cookies is present', () => {
      render(<LandingPage />)
      expect(screen.getByRole('link', { name: /cookies/i })).toHaveAttribute(
        'href',
        '/cookies'
      )
    })
  })

  // ─── LAND-002: Nav ────────────────────────────────────────────
  describe('Main navigation (LAND-002)', () => {
    it('LAND-002a: <nav aria-label="Main"> is present', () => {
      render(<LandingPage />)
      expect(
        screen.getByRole('navigation', { name: /main/i })
      ).toBeInTheDocument()
    })

    it('LAND-002b: "Sign in" links to /login', () => {
      render(<LandingPage />)
      expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute(
        'href',
        '/login'
      )
    })

    it('LAND-002c: "Start" links to /register', () => {
      render(<LandingPage />)
      // nav "Start" link has aria-label="Start your chronicle"
      const startLinks = screen.getAllByRole('link', {
        name: /start your chronicle/i,
      })
      expect(
        startLinks.some((l) => l.getAttribute('href') === '/register')
      ).toBe(true)
    })
  })

  // ─── LAND-013: Accessibility ──────────────────────────────────
  describe('Accessibility (LAND-013)', () => {
    it('LAND-013b: any aria-disabled CTA is never natively disabled', () => {
      render(<LandingPage />)
      // The landing no longer ships disabled CTAs (the demo buttons are live
      // links now), but if any aria-disabled control returns, it must use
      // aria-disabled rather than the native disabled attribute so it stays
      // focusable and announced.
      const disabledButtons = screen
        .getAllByRole('button')
        .filter((b) => b.hasAttribute('aria-disabled'))
      disabledButtons.forEach((b) => expect(b).not.toBeDisabled())
    })

    it('LAND-013c: both demo CTAs are reachable links to /demo', () => {
      render(<LandingPage />)
      const demoLinks = screen
        .getAllByRole('link')
        .filter((link) => link.getAttribute('href') === '/demo')
      expect(demoLinks.length).toBeGreaterThanOrEqual(2)
    })
  })
})

// ─── LAND-012: Landing page metadata ──────────────────────────────
// Task 4.2 — RED phase: import metadata from app/page.tsx and assert
// correct title and description. Written before page.tsx is updated.
describe('app/page.tsx metadata (LAND-012)', () => {
  it('LAND-012a: English title matches "Lazy Lands — Campaign Companion for Dungeon Masters"', async () => {
    const { generateMetadata } = await import('@/app/[locale]/page')
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'en' }),
    })
    expect((metadata as { title?: string }).title).toBe(
      'Lazy Lands · Campaign Companion for Dungeon Masters'
    )
  })

  it('LAND-012b: English description contains "NPC", "faction", and "consequence"', async () => {
    const { generateMetadata } = await import('@/app/[locale]/page')
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'en' }),
    })
    const description = (metadata as { description?: string }).description ?? ''
    expect(description).toMatch(/npc/i)
    expect(description).toMatch(/faction/i)
    expect(description).toMatch(/consequence/i)
  })

  it('LAND-012c: Spanish title is localized', async () => {
    const { generateMetadata } = await import('@/app/[locale]/page')
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'es' }),
    })
    expect((metadata as { title?: string }).title).toContain('Dungeon Masters')
  })
})
