import { render, screen } from '@testing-library/react'

import { LandingPage } from '@/components/landing-page'

describe('LandingPage', () => {
  it('identifies Lazy Lands as the campaign companion for Dungeon Masters', () => {
    render(<LandingPage />)

    expect(
      screen.getByRole('heading', { name: /Lazy Lands/i })
    ).toBeInTheDocument()
    expect(
      screen.getByText('Campaign Companion for Dungeon Masters')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Remember what happened. Prepare what comes next.')
    ).toBeInTheDocument()
  })

  it('links users to authentication entry points', () => {
    render(<LandingPage />)

    expect(screen.getByRole('link', { name: 'Login' })).toHaveAttribute(
      'href',
      '/login'
    )
    expect(screen.getByRole('link', { name: 'Register' })).toHaveAttribute(
      'href',
      '/register'
    )
  })
})
