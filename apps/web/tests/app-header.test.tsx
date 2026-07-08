import { render, screen } from '@/tests/intl'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/auth/logout-button', () => ({
  LogoutButton: () => <button type="button">Log out</button>,
}))

import { AppHeader } from '@/components/layout/app-header'

describe('AppHeader', () => {
  it('links the wordmark to the dashboard', () => {
    render(
      <AppHeader email="contacto@danilopgon.com">
        <p>child</p>
      </AppHeader>
    )

    expect(screen.getByRole('link', { name: /lazy lands/i })).toHaveAttribute(
      'href',
      '/dashboard'
    )
  })

  it('shows the language switcher trigger and the logout action', () => {
    render(
      <AppHeader email="contacto@danilopgon.com">
        <p>child</p>
      </AppHeader>
    )

    expect(screen.getByText('EN')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument()
  })

  it('renders the initials avatar with the email as its accessible label', () => {
    render(
      <AppHeader email="contacto@danilopgon.com">
        <p>child</p>
      </AppHeader>
    )

    const avatar = screen.getByLabelText('Signed in as contacto@danilopgon.com')
    expect(avatar).toHaveTextContent('CO')
  })

  it('renders its children below the bar', () => {
    render(
      <AppHeader email="contacto@danilopgon.com">
        <p>page body</p>
      </AppHeader>
    )

    expect(screen.getByText('page body')).toBeInTheDocument()
  })

  it('renders a neutral avatar when no email is known', () => {
    render(
      <AppHeader email={null}>
        <p>child</p>
      </AppHeader>
    )

    expect(screen.getByText('?')).toBeInTheDocument()
  })
})
