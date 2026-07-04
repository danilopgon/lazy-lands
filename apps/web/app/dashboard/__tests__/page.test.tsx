import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/auth/logout-button', () => ({
  LogoutButton: () => <button type="button">Log out</button>,
}))

import DashboardPage from '../page'

describe('DashboardPage', () => {
  it('shows a provisional action to start campaign creation', () => {
    render(<DashboardPage />)

    const link = screen.getByRole('link', { name: /create campaign/i })
    expect(link).toHaveAttribute('href', '/campaigns/new')
  })
})
