import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { render, screen, within } from '@/tests/intl'

vi.mock('next/link', async () => {
  const { createElement } = await import('react')
  return {
    default: ({
      href,
      children,
      ...props
    }: {
      href: string
      children?: React.ReactNode
    }) => createElement('a', { href, ...props }, children),
    useLinkStatus: () => ({ pending: false }),
  }
})

import { PublicTop } from '@/components/landing/public-top'

/**
 * Open the mobile overlay.
 *
 * @returns {Promise<void>} Resolves once the dialog is on screen.
 */
async function openMenu() {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Open menu' }))
  await screen.findByRole('dialog', { name: 'Mobile navigation' })
  return user
}

describe('PublicTop mobile menu', () => {
  afterEach(() => {
    window.history.pushState({}, '', '/')
  })

  it('keeps the overlay open while a chosen route is still loading', async () => {
    render(<PublicTop />)
    const user = await openMenu()

    const dialog = screen.getByRole('dialog', { name: 'Mobile navigation' })
    await user.click(within(dialog).getByRole('link', { name: /sign in/i }))

    // Closing on click unmounts the link before its 150ms grace period, so the
    // pending affordance could never appear for a slow navigation.
    expect(
      screen.getByRole('dialog', { name: 'Mobile navigation' })
    ).toBeInTheDocument()
  })

  it('closes the overlay once the route has changed', async () => {
    const { rerender } = render(<PublicTop />)
    await openMenu()

    window.history.pushState({}, '', '/login')
    rerender(<PublicTop />)

    expect(
      screen.queryByRole('dialog', { name: 'Mobile navigation' })
    ).not.toBeInTheDocument()
  })

  it('still closes immediately for same-page anchors', async () => {
    render(<PublicTop />)
    const user = await openMenu()

    const dialog = screen.getByRole('dialog', { name: 'Mobile navigation' })
    await user.click(within(dialog).getByRole('link', { name: /product/i }))

    // A hash target scrolls the page behind the overlay; leaving it open would
    // hide the very section it jumped to.
    expect(
      screen.queryByRole('dialog', { name: 'Mobile navigation' })
    ).not.toBeInTheDocument()
  })
})
