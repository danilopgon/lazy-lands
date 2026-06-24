import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'

// TDD RED phase — tests written before implementation.
// This file covers:
//   - ComingSoonButton (LAND-003d, LAND-009d, LAND-013b)
//   - CookieBanner (LAND-011a/b/c/d)
//   - AnnouncementBar (LAND-001a/b/c/d)

// ─────────────────────────────────────────────────────────────────
// Shared localStorage mock
// ─────────────────────────────────────────────────────────────────
const store = new Map<string, string>()
const localStorageMock = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => {
    store.set(k, String(v))
  },
  removeItem: (k: string) => {
    store.delete(k)
  },
  clear: () => store.clear(),
}

beforeEach(() => {
  store.clear()
  vi.stubGlobal('localStorage', localStorageMock)
})

// ─────────────────────────────────────────────────────────────────
// ComingSoonButton
// ─────────────────────────────────────────────────────────────────
describe('ComingSoonButton', () => {
  it('LAND-003d: has aria-disabled="true" (NOT native disabled)', async () => {
    const { ComingSoonButton } = await import('@/components/coming-soon-button')
    render(<ComingSoonButton>See it on a real campaign</ComingSoonButton>)
    const btn = screen.getByRole('button', {
      name: /see it on a real campaign/i,
    })
    expect(btn).toHaveAttribute('aria-disabled', 'true')
    // Must NOT be natively disabled (which kills hover/tooltip)
    expect(btn).not.toBeDisabled()
  })

  it('LAND-013b: has tabIndex=0 so it is keyboard reachable', async () => {
    const { ComingSoonButton } = await import('@/components/coming-soon-button')
    render(<ComingSoonButton>See it on a real campaign</ComingSoonButton>)
    const btn = screen.getByRole('button', {
      name: /see it on a real campaign/i,
    })
    expect(btn).toHaveAttribute('tabindex', '0')
  })

  it('LAND-003e: renders tooltip with text "Coming soon"', async () => {
    const { ComingSoonButton } = await import('@/components/coming-soon-button')
    render(<ComingSoonButton>See it on a real campaign</ComingSoonButton>)
    expect(screen.getByRole('tooltip', { hidden: true })).toHaveTextContent(
      'Coming soon'
    )
  })

  it('prevents navigation on click (aria-disabled behavior)', async () => {
    const { ComingSoonButton } = await import('@/components/coming-soon-button')
    const user = userEvent.setup()
    render(<ComingSoonButton>See it on a real campaign</ComingSoonButton>)
    const btn = screen.getByRole('button', {
      name: /see it on a real campaign/i,
    })
    // Should not throw — click is intercepted via preventDefault
    await user.click(btn)
  })
})

// ─────────────────────────────────────────────────────────────────
// CookieBanner
// ─────────────────────────────────────────────────────────────────
describe('CookieBanner', () => {
  it('LAND-011a: renders when ll-cookie-consent is absent', async () => {
    const { CookieBanner } = await import('@/components/cookie-banner')
    render(<CookieBanner />)
    // useEffect runs after mount — banner appears after effect
    expect(
      await screen.findByRole('region', { name: /cookie notice/i })
    ).toBeInTheDocument()
  })

  it('LAND-011b: does NOT render when ll-cookie-consent is set', async () => {
    localStorageMock.setItem('ll-cookie-consent', 'acknowledged')
    const { CookieBanner } = await import('@/components/cookie-banner')
    render(<CookieBanner />)
    // Give useEffect time to run
    await new Promise((r) => setTimeout(r, 20))
    expect(
      screen.queryByRole('region', { name: /cookie notice/i })
    ).not.toBeInTheDocument()
  })

  it('LAND-011c: "Got it" writes "acknowledged" to ll-cookie-consent and hides banner', async () => {
    const { CookieBanner } = await import('@/components/cookie-banner')
    const user = userEvent.setup()
    render(<CookieBanner />)
    await screen.findByRole('region', { name: /cookie notice/i })
    await user.click(screen.getByRole('button', { name: /got it/i }))
    expect(localStorageMock.getItem('ll-cookie-consent')).toBe('acknowledged')
    expect(
      screen.queryByRole('region', { name: /cookie notice/i })
    ).not.toBeInTheDocument()
  })

  it('LAND-011d: has role="region" and aria-label="Cookie notice"', async () => {
    const { CookieBanner } = await import('@/components/cookie-banner')
    render(<CookieBanner />)
    const region = await screen.findByRole('region', { name: /cookie notice/i })
    expect(region).toHaveAttribute('aria-label', 'Cookie notice')
  })
})

// ─────────────────────────────────────────────────────────────────
// AnnouncementBar
// ─────────────────────────────────────────────────────────────────
describe('AnnouncementBar', () => {
  it('LAND-001a: renders when ll-announcement-dismissed is absent', async () => {
    const { AnnouncementBar } = await import('@/components/announcement-bar')
    render(<AnnouncementBar />)
    expect(
      await screen.findByText(/under active development/i)
    ).toBeInTheDocument()
  })

  it('LAND-001b: does NOT render when ll-announcement-dismissed is set', async () => {
    localStorageMock.setItem('ll-announcement-dismissed', 'dismissed')
    const { AnnouncementBar } = await import('@/components/announcement-bar')
    render(<AnnouncementBar />)
    await new Promise((r) => setTimeout(r, 20))
    expect(
      screen.queryByText(/under active development/i)
    ).not.toBeInTheDocument()
  })

  it('LAND-001c: dismiss (×) sets localStorage key and removes bar', async () => {
    const { AnnouncementBar } = await import('@/components/announcement-bar')
    const user = userEvent.setup()
    render(<AnnouncementBar />)
    await screen.findByText(/under active development/i)
    await user.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(localStorageMock.getItem('ll-announcement-dismissed')).not.toBeNull()
    expect(
      screen.queryByText(/under active development/i)
    ).not.toBeInTheDocument()
  })

  it('LAND-001d: contains a link to /register', async () => {
    const { AnnouncementBar } = await import('@/components/announcement-bar')
    render(<AnnouncementBar />)
    await screen.findByText(/under active development/i)
    const link = screen.getByRole('link', { name: /sign up/i })
    expect(link).toHaveAttribute('href', '/register')
  })
})
