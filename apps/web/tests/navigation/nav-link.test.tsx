import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { render, screen } from '@/tests/intl'
import { NAV_PENDING_DELAY_MS } from '@/lib/motion/tokens'

const linkStatus = { pending: false }

// `tests/setup.ts` stubs this to a bare anchor, which would hide the topology
// under test.
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

// jsdom resolves the Pages-Router build, whose `LinkStatusContext` is
// permanently `{ pending: false }`.
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

  it('keeps the live region mounted and empty while idle', () => {
    render(<NavLink href="/dashboard">Dashboard</NavLink>)

    const slot = screen.getByTestId(PENDING_SLOT)
    expect(slot).toHaveAttribute('aria-live', 'polite')
    expect(slot).toBeEmptyDOMElement()
  })

  it('leaves the link name untouched while idle', () => {
    render(<NavLink href="/dashboard">Dashboard</NavLink>)

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
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
    expect(screen.getByTestId(PENDING_SLOT)).toBeEmptyDOMElement()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.getByTestId(PENDING_SLOT)).not.toBeEmptyDOMElement()
  })

  it('clears the affordance once the navigation settles', () => {
    linkStatus.pending = true
    const { rerender } = render(<NavLink href="/dashboard">Dashboard</NavLink>)
    act(() => {
      vi.advanceTimersByTime(NAV_PENDING_DELAY_MS)
    })
    expect(screen.getByTestId(PENDING_SLOT)).not.toBeEmptyDOMElement()

    linkStatus.pending = false
    rerender(<NavLink href="/dashboard">Dashboard</NavLink>)

    expect(screen.getByTestId(PENDING_SLOT)).toBeEmptyDOMElement()
  })

  it('announces the pending navigation with localized copy', () => {
    linkStatus.pending = true
    render(<NavLink href="/dashboard">Dashboard</NavLink>)

    act(() => {
      vi.advanceTimersByTime(NAV_PENDING_DELAY_MS)
    })

    expect(screen.getByTestId(PENDING_SLOT)).toHaveTextContent(/opening/i)
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

    expect(screen.getByTestId(PENDING_SLOT)).not.toBeEmptyDOMElement()
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

      expect(screen.getByTestId(PENDING_SLOT)).not.toBeEmptyDOMElement()
      delete document.documentElement.dataset.motion
    }
  )
})
