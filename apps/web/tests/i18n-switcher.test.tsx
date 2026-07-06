import { NextIntlClientProvider } from 'next-intl'
import { render, screen } from '@testing-library/react'
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

    expect(screen.getByRole('link', { name: 'ES' })).toHaveAttribute(
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

    expect(screen.getByRole('link', { name: /español/i })).toHaveAttribute(
      'href',
      '/es'
    )
  })
})
