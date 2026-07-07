import { act, render, screen, waitFor } from '@/tests/intl'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockSignInWithPassword, mockPush } = vi.hoisted(() => ({
  mockSignInWithPassword: vi.fn(),
  mockPush: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signInWithPassword: mockSignInWithPassword },
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

import LoginPage from '../page'

describe('LoginPage (AU-001)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('offers a link to the register page', () => {
    render(<LoginPage />)

    const link = screen.getByRole('link', {
      name: /create an account|sign up|register/i,
    })
    expect(link).toHaveAttribute('href', '/register')
  })

  it('offers a "Forgot password?" link pointing to /forgot-password', () => {
    render(<LoginPage />)

    const link = screen.getByRole('link', { name: /forgot.?password/i })
    expect(link).toHaveAttribute('href', '/forgot-password')
  })

  it('offers a back-to-home link', () => {
    render(<LoginPage />)

    const link = screen.getByRole('link', { name: 'Back home' })
    expect(link).toHaveAttribute('href', '/')
  })

  it('AU-T-01: empty email → validation error; no Supabase call', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      const alerts = screen.getAllByRole('alert')
      expect(alerts.length).toBeGreaterThan(0)
      expect(alerts.some((el) => /email/i.test(el.textContent!))).toBe(true)
    })
    expect(mockSignInWithPassword).not.toHaveBeenCalled()
  })

  it('AU-T-02: invalid email format → validation error; no Supabase call', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'not-an-email')
    await user.type(screen.getByLabelText(/password/i), 'somepass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
    })
    expect(mockSignInWithPassword).not.toHaveBeenCalled()
  })

  it('AU-T-03: empty password → validation error; no Supabase call', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      const alerts = screen.getAllByRole('alert')
      expect(alerts.length).toBeGreaterThan(0)
      expect(alerts.some((el) => /password/i.test(el.textContent!))).toBe(true)
    })
    expect(mockSignInWithPassword).not.toHaveBeenCalled()
  })

  it('AU-T-04: valid input → signInWithPassword called', async () => {
    const user = userEvent.setup()
    mockSignInWithPassword.mockResolvedValue({
      data: { user: {} },
      error: null,
    })
    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })

  it('AU-T-05: successful login → navigates to /dashboard', async () => {
    const user = userEvent.setup()
    mockSignInWithPassword.mockResolvedValue({
      data: { user: {} },
      error: null,
    })
    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('AU-T-06: error response → error message in DOM; no navigation', async () => {
    const user = userEvent.setup()
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid credentials' },
    })
    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('AU-T-08: rejected sign-in → error shown, button re-enabled, no navigation', async () => {
    const user = userEvent.setup()
    mockSignInWithPassword.mockRejectedValue(new Error('network down'))
    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/unable to sign in right now/i)
      ).toBeInTheDocument()
    })
    expect(mockPush).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled()
  })

  it('AU-T-07: submit button disabled while in-flight', async () => {
    const user = userEvent.setup()
    let resolvePromise: (value: unknown) => void
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve
    })
    mockSignInWithPassword.mockReturnValue(pendingPromise)
    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      const submitBtn = screen.getByRole('button', { name: /signing in/i })
      expect(submitBtn).toBeDisabled()
    })

    await act(async () => {
      resolvePromise!({ data: { user: {} }, error: null })
    })
  })
})
