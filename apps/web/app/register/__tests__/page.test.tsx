import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockSignUp, mockPush } = vi.hoisted(() => ({
  mockSignUp: vi.fn(),
  mockPush: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signUp: mockSignUp },
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

import RegisterPage from '../page'

describe('RegisterPage (AU-002)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  })

  afterEach(() => {
    vi.resetModules()
    delete process.env.NEXT_PUBLIC_APP_URL
  })

  it('offers a link to the login page', () => {
    render(<RegisterPage />)

    const link = screen.getByRole('link', { name: /sign in|log in|login/i })
    expect(link).toHaveAttribute('href', '/login')
  })

  it('offers a back-to-home link', () => {
    render(<RegisterPage />)

    const link = screen.getByRole('link', { name: 'volver al inicio' })
    expect(link).toHaveAttribute('href', '/')
  })

  it('AU-T-08: invalid email format → validation error; no Supabase call', async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByLabelText(/email/i), 'not-an-email')
    await user.type(screen.getByLabelText(/password/i), 'somepass')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
    })
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('shows strong password requirements in the register form', () => {
    render(<RegisterPage />)

    expect(screen.getByText(/use at least 8 characters/i)).toBeInTheDocument()
    expect(screen.getByText(/include a lowercase letter/i)).toBeInTheDocument()
    expect(screen.getByText(/include an uppercase letter/i)).toBeInTheDocument()
    expect(screen.getByText(/include a number/i)).toBeInTheDocument()
    expect(screen.getByText(/include a special character/i)).toBeInTheDocument()
  })

  it('blocks signup when the password does not meet strength requirements', async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(
        screen.getByText(
          /password must include uppercase, lowercase, number, and special character/i
        )
      ).toBeInTheDocument()
    })
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('AU-T-09: valid input → signUp called with emailRedirectTo pointing to /auth/confirm', async () => {
    const user = userEvent.setup()
    mockSignUp.mockResolvedValue({
      data: { user: {}, session: null },
      error: null,
    })
    render(<RegisterPage />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'Password123!')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          password: 'Password123!',
          options: expect.objectContaining({
            emailRedirectTo: expect.stringContaining('/auth/confirm'),
          }),
        })
      )
    })
  })

  it('AU-T-10: successful signUp → "Check your email" visible; NOT navigated to /dashboard', async () => {
    const user = userEvent.setup()
    mockSignUp.mockResolvedValue({
      data: { user: {}, session: null },
      error: null,
    })
    render(<RegisterPage />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'Password123!')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument()
    })
    // Success replaces the form (non-interactive) and does NOT redirect.
    expect(
      screen.queryByRole('button', { name: /sign up/i })
    ).not.toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('AU-T-11: error signUp → error message visible in DOM', async () => {
    const user = userEvent.setup()
    mockSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Email already registered' },
    })
    render(<RegisterPage />)

    await user.type(screen.getByLabelText(/email/i), 'existing@example.com')
    await user.type(screen.getByLabelText(/password/i), 'Password123!')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(screen.getByText(/email already registered/i)).toBeInTheDocument()
    })
  })
})
