import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { LandingPage } from '@/components/landing/landing-page'

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

    it('LAND-003d: secondary CTA has aria-disabled="true"', () => {
      render(<LandingPage />)
      // There may be two ComingSoonButtons; find the hero one by text
      const buttons = screen.getAllByRole('button', {
        name: /see it on a real campaign/i,
      })
      expect(buttons[0]).toHaveAttribute('aria-disabled', 'true')
    })

    it('LAND-003e: secondary CTA tooltip text is "Coming soon"', () => {
      render(<LandingPage />)
      const tooltips = screen.getAllByRole('tooltip', { hidden: true })
      expect(tooltips.some((t) => t.textContent === 'Coming soon')).toBe(true)
    })
  })

  // ─── LAND-004: Marquee feature strings ────────────────────────
  describe('Marquee section (LAND-004)', () => {
    it('LAND-004a: renders all six feature strings', () => {
      render(<LandingPage />)
      // Items are duplicated for seamless loop, so use getAllByText
      expect(
        screen.getAllByText(/persistent campaign memory/i).length
      ).toBeGreaterThan(0)
      expect(
        screen.getAllByText(/npcs · factions · open arcs/i).length
      ).toBeGreaterThan(0)
      expect(
        screen.getAllByText(/session briefings with full context/i).length
      ).toBeGreaterThan(0)
      expect(
        screen.getAllByText(/the scribe proposes, you decide/i).length
      ).toBeGreaterThan(0)
      expect(screen.getAllByText(/export to pdf/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/no lock-in/i).length).toBeGreaterThan(0)
    })
  })

  // ─── LAND-005: Pillars section ────────────────────────────────
  describe('Pillars section (LAND-005)', () => {
    it('LAND-005a: section has id="product"', () => {
      render(<LandingPage />)
      expect(document.getElementById('product')).toBeInTheDocument()
    })

    it('LAND-005b/c/d: renders all three pillar eyebrows', () => {
      render(<LandingPage />)
      expect(screen.getByText(/01 · remember/i)).toBeInTheDocument()
      expect(screen.getByText(/02 · prepare/i)).toBeInTheDocument()
      expect(screen.getByText(/03 · continuity/i)).toBeInTheDocument()
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
      expect(screen.getByText(/3 min/i)).toBeInTheDocument()
      expect(screen.getByText(/7 sessions/i)).toBeInTheDocument()
      // "Canon" appears multiple times (stat + body copy); check the stat value specifically
      expect(screen.getAllByText(/Canon/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Editable/i).length).toBeGreaterThan(0)
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
    it('LAND-009a: section has id="pricing"', () => {
      render(<LandingPage />)
      expect(document.getElementById('pricing')).toBeInTheDocument()
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

    it('LAND-009d: secondary CTA has aria-disabled="true" and tooltip', () => {
      render(<LandingPage />)
      const btn = screen.getByRole('button', { name: /tour a demo campaign/i })
      expect(btn).toHaveAttribute('aria-disabled', 'true')
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
    it('LAND-013b: disabled CTAs carry aria-disabled="true" not native disabled', () => {
      render(<LandingPage />)
      const disabledButtons = screen
        .getAllByRole('button')
        .filter((b) => b.hasAttribute('aria-disabled'))
      expect(disabledButtons.length).toBeGreaterThan(0)
      // None should be natively disabled
      disabledButtons.forEach((b) => expect(b).not.toBeDisabled())
    })
  })
})

// ─── LAND-012: Landing page metadata ──────────────────────────────
// Task 4.2 — RED phase: import metadata from app/page.tsx and assert
// correct title and description. Written before page.tsx is updated.
describe('app/page.tsx metadata (LAND-012)', () => {
  it('LAND-012a: title matches "Lazy Lands — Campaign Companion for Dungeon Masters"', async () => {
    const { metadata } = await import('@/app/page')
    expect((metadata as { title?: string }).title).toBe(
      'Lazy Lands — Campaign Companion for Dungeon Masters'
    )
  })

  it('LAND-012b: description contains "NPC", "faction", and "consequence"', async () => {
    const { metadata } = await import('@/app/page')
    const description = (metadata as { description?: string }).description ?? ''
    expect(description).toMatch(/npc/i)
    expect(description).toMatch(/faction/i)
    expect(description).toMatch(/consequence/i)
  })
})
