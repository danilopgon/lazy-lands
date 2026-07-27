import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { render, screen } from '@/tests/intl'
import { NAV_PENDING_DELAY_MS } from '@/lib/motion/tokens'

const linkStatus = { pending: false }

// `NavLink`'s reader is only correct if it renders INSIDE Next's `<Link>`, whose
// provider owns the pending state. The app's `@/i18n/navigation` Link is stubbed
// to a bare anchor by `tests/setup.ts`, which would make that topology
// unobservable — so this file overrides the stub with Next's real `Link`.
vi.mock('@/i18n/navigation', async () => {
  const nextLink = await import('next/link')
  return {
    Link: nextLink.default,
    usePathname: () => '/',
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
    redirect: () => {
      throw new Error('NEXT_REDIRECT')
    },
    getPathname: () => '/',
  }
})

// jsdom runs the Pages-Router build of `next/link`, whose `LinkStatusContext`
// default is permanently `{ pending: false }`; only the App Router build ever
// publishes a real value. Overriding the reader — while keeping the real `Link`
// above — is the only way to drive the pending branch under test.
vi.mock('next/link', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/link')>()
  return {
    ...actual,
    default: actual.default,
    useLinkStatus: () => linkStatus,
  }
})

import { NavLink } from '@/components/navigation/nav-link'

const PENDING_SLOT = 'nav-link-pending'

describe('NavLink', () => {
  beforeEach(() => {
    linkStatus.pending = false
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders an in-app link with its children and destination', () => {
    render(<NavLink href="/dashboard">Dashboard</NavLink>)

    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute(
      'href',
      '/dashboard'
    )
  })

  it('renders its pending reader inside the Link anchor subtree', () => {
    render(<NavLink href="/dashboard">Dashboard</NavLink>)

    const anchor = screen.getByRole('link', { name: /dashboard/i })
    const slot = screen.getByTestId(PENDING_SLOT)

    expect(anchor.contains(slot)).toBe(true)
  })

  it('exposes no status node while the navigation is idle', () => {
    render(<NavLink href="/dashboard">Dashboard</NavLink>)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByTestId(PENDING_SLOT)).toHaveAttribute(
      'aria-hidden',
      'true'
    )
  })

  it('reserves the same affordance footprint idle and pending', () => {
    const { rerender } = render(<NavLink href="/dashboard">Dashboard</NavLink>)
    const idleClassName = screen.getByTestId(PENDING_SLOT).className

    linkStatus.pending = true
    rerender(<NavLink href="/dashboard">Dashboard</NavLink>)
    act(() => {
      vi.advanceTimersByTime(NAV_PENDING_DELAY_MS)
    })

    expect(screen.getByTestId(PENDING_SLOT).className).toBe(idleClassName)
  })

  it('reveals the status affordance only after the grace delay', () => {
    linkStatus.pending = true
    render(<NavLink href="/dashboard">Dashboard</NavLink>)

    act(() => {
      vi.advanceTimersByTime(NAV_PENDING_DELAY_MS - 1)
    })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('clears the affordance once the navigation settles', () => {
    linkStatus.pending = true
    const { rerender } = render(<NavLink href="/dashboard">Dashboard</NavLink>)
    act(() => {
      vi.advanceTimersByTime(NAV_PENDING_DELAY_MS)
    })
    expect(screen.getByRole('status')).toBeInTheDocument()

    linkStatus.pending = false
    rerender(<NavLink href="/dashboard">Dashboard</NavLink>)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('announces the pending navigation with localized copy', () => {
    linkStatus.pending = true
    render(<NavLink href="/dashboard">Dashboard</NavLink>)

    act(() => {
      vi.advanceTimersByTime(NAV_PENDING_DELAY_MS)
    })

    expect(screen.getByRole('status')).toHaveTextContent(/opening/i)
  })

  it('keeps a repositioned status slot in place through the pending state', () => {
    const placement = 'absolute right-5 top-4'
    linkStatus.pending = false
    const { rerender } = render(
      <NavLink href="/dashboard" pendingSlotClassName={placement}>
        Dashboard
      </NavLink>
    )
    expect(screen.getByTestId(PENDING_SLOT).className).toBe(placement)

    linkStatus.pending = true
    rerender(
      <NavLink href="/dashboard" pendingSlotClassName={placement}>
        Dashboard
      </NavLink>
    )
    act(() => {
      vi.advanceTimersByTime(NAV_PENDING_DELAY_MS)
    })

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByTestId(PENDING_SLOT).className).toBe(placement)
  })

  it('renders a bare anchor with no affordance for hash targets', () => {
    render(<NavLink href="#product">Product</NavLink>)

    expect(screen.getByRole('link', { name: 'Product' })).toHaveAttribute(
      'href',
      '#product'
    )
    expect(screen.queryByTestId(PENDING_SLOT)).not.toBeInTheDocument()
  })

  it('renders a bare anchor with no affordance for external targets', () => {
    render(<NavLink href="https://example.com">External</NavLink>)

    expect(screen.getByRole('link', { name: 'External' })).toHaveAttribute(
      'href',
      'https://example.com'
    )
    expect(screen.queryByTestId(PENDING_SLOT)).not.toBeInTheDocument()
  })

  it.each(['full', 'subtle', 'off'] as const)(
    'renders the same pending affordance under data-motion="%s"',
    (mode) => {
      document.documentElement.dataset.motion = mode
      linkStatus.pending = true
      render(<NavLink href="/dashboard">Dashboard</NavLink>)

      act(() => {
        vi.advanceTimersByTime(NAV_PENDING_DELAY_MS)
      })

      expect(screen.getByRole('status')).toBeInTheDocument()
      delete document.documentElement.dataset.motion
    }
  )
})
