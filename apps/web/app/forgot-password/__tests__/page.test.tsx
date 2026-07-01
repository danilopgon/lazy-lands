import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockResetPasswordForEmail } = vi.hoisted(() => ({
  mockResetPasswordForEmail: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { resetPasswordForEmail: mockResetPasswordForEmail },
  }),
}))

import ForgotPasswordPage from '../page'

describe('ForgotPasswordPage (AU-005)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  })

  afterEach(() => {
    vi.resetModules()
    delete process.env.NEXT_PUBLIC_APP_URL
  })

  it('AU-T-18: invalid email format → validation error; no Supabase call', async () => {
    const user = userEvent.setup()
    render(<ForgotPasswordPage />)

    await user.type(screen.getByLabelText(/email/i), 'not-an-email')
    await user.click(screen.getByRole('button', { name: /send/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
    })
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled()
  })

  it('AU-T-19: valid email → resetPasswordForEmail called with correct redirectTo', async () => {
    const user = userEvent.setup()
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null })
    render(<ForgotPasswordPage />)

    await user.type(screen.getByLabelText(/email/i), 'user@example.com')
    await user.click(screen.getByRole('button', { name: /send/i }))

    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        'user@example.com',
        expect.objectContaining({
          redirectTo: expect.stringContaining('/auth/reset'),
        })
      )
    })
  })

  it('AU-T-20 (success): after submit → uniform confirmation message; form non-interactive', async () => {
    const user = userEvent.setup()
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null })
    render(<ForgotPasswordPage />)

    await user.type(screen.getByLabelText(/email/i), 'user@example.com')
    await user.click(screen.getByRole('button', { name: /send/i }))

    await waitFor(() => {
      expect(screen.getByText(/if an account exists/i)).toBeInTheDocument()
    })
    // Form must be non-interactive after submission (button gone / input removed)
    expect(
      screen.queryByRole('button', { name: /send/i })
    ).not.toBeInTheDocument()
  })

  it('AU-T-20 (failure): after submit error → same uniform confirmation message; error NOT shown', async () => {
    const user = userEvent.setup()
    mockResetPasswordForEmail.mockResolvedValue({
      data: {},
      error: { message: 'Email not found' },
    })
    render(<ForgotPasswordPage />)

    await user.type(screen.getByLabelText(/email/i), 'unknown@example.com')
    await user.click(screen.getByRole('button', { name: /send/i }))

    await waitFor(() => {
      expect(screen.getByText(/if an account exists/i)).toBeInTheDocument()
    })
    // The Supabase error message must NOT appear (NFR-AU-4 anti-enumeration)
    expect(screen.queryByText(/email not found/i)).not.toBeInTheDocument()
    // Form must also be non-interactive on error
    expect(
      screen.queryByRole('button', { name: /send/i })
    ).not.toBeInTheDocument()
  })
})
