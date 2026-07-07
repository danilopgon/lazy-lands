import { NextIntlClientProvider } from 'next-intl'
import { within } from '@testing-library/react'
import { render, screen } from '@/tests/intl'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import en from '@/messages/en.json'
import es from '@/messages/es.json'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { PublicTop } from '@/components/landing/public-top'

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    window.history.pushState(null, '', '/es/dashboard?x=1')
  })

  it('links to the unprefixed English path while preserving search params', () => {
    render(
      <NextIntlClientProvider locale="es" messages={es}>
        <LanguageSwitcher />
      </NextIntlClientProvider>
    )

    expect(screen.getByRole('link', { name: /english/i })).toHaveAttribute(
      'href',
      '/dashboard?x=1'
    )
  })

  it('links to the Spanish prefixed path while preserving search params', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <LanguageSwitcher />
      </NextIntlClientProvider>
    )

    expect(screen.getByRole('link', { name: /español/i })).toHaveAttribute(
      'href',
      '/es/dashboard?x=1'
    )
  })

  it('renders in the public top navigation without displacing auth actions', () => {
    window.history.pushState(null, '', '/')

    render(<PublicTop />)

    // The compact trigger shows the active locale code; the panel holds the
    // real per-locale links.
    expect(screen.getByText('EN')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /español/i })).toHaveAttribute(
      'href',
      '/es'
    )
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute(
      'href',
      '/login'
    )
    expect(screen.getAllByRole('link', { name: /start/i })[0]).toHaveAttribute(
      'href',
      '/register'
    )
  })

  it('renders in the mobile overlay with full language labels', async () => {
    const user = userEvent.setup()
    window.history.pushState(null, '', '/')

    render(<PublicTop />)
    await user.click(screen.getByRole('button', { name: /open menu/i }))

    // Both the desktop trigger's panel and the inline overlay list carry a
    // Spanish link, so scope the assertion to the overlay dialog.
    const overlay = screen.getByRole('dialog')
    expect(
      within(overlay).getByRole('link', { name: /español/i })
    ).toHaveAttribute('href', '/es')
  })
})
