import { StrictMode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockVerifyOtp, mockUpdateUser, mockSearchParamsGet, mockAssign } =
  vi.hoisted(() => ({
    mockVerifyOtp: vi.fn(),
    mockUpdateUser: vi.fn(),
    mockSearchParamsGet: vi.fn(),
    mockAssign: vi.fn(),
  }))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      verifyOtp: mockVerifyOtp,
      updateUser: mockUpdateUser,
    },
  }),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: mockSearchParamsGet }),
}))

import ResetPage from '../page'

describe('ResetPage (AU-006)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('location', { assign: mockAssign })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('offers a back-to-home link in the auth card', async () => {
    mockSearchParamsGet.mockReturnValue(null)

    render(<ResetPage />)

    const link = await screen.findByRole('link', { name: 'volver al inicio' })
    expect(link).toHaveAttribute('href', '/')
  })

  it('S-03: missing token_hash → immediate error state; verifyOtp NOT called', async () => {
    mockSearchParamsGet.mockReturnValue(null)

    render(<ResetPage />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(mockVerifyOtp).not.toHaveBeenCalled()
  })

  it('S-01: token_hash present but type=signup → immediate error; verifyOtp NOT called', async () => {
    mockSearchParamsGet.mockImplementation((key: string) => {
      if (key === 'token_hash') return 'valid-hash-123'
      if (key === 'type') return 'signup'
      return null
    })

    render(<ResetPage />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(mockVerifyOtp).not.toHaveBeenCalled()
  })

  it('AU-T-21: valid token_hash + type=recovery → verifyOtp succeeds → new password form shown', async () => {
    mockSearchParamsGet.mockImplementation((key: string) => {
      if (key === 'token_hash') return 'valid-hash-123'
      if (key === 'type') return 'recovery'
      return null
    })
    mockVerifyOtp.mockResolvedValue({ data: {}, error: null })

    render(<ResetPage />)

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        token_hash: 'valid-hash-123',
        type: 'recovery',
      })
    })

    await waitFor(() => {
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument()
    })
  })

  it('AU-T-22: verifyOtp error on mount → error message; link to /forgot-password present', async () => {
    mockSearchParamsGet.mockImplementation((key: string) => {
      if (key === 'token_hash') return 'expired-hash'
      if (key === 'type') return 'recovery'
      return null
    })
    mockVerifyOtp.mockResolvedValue({
      data: {},
      error: { message: 'Token has expired or is invalid' },
    })

    render(<ResetPage />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    const link = screen.getByRole('link', { name: /forgot.?password|request/i })
    expect(link).toHaveAttribute('href', '/forgot-password')
  })

  it('AU-T-23: password mismatch → validation error; updateUser NOT called', async () => {
    mockSearchParamsGet.mockImplementation((key: string) => {
      if (key === 'token_hash') return 'valid-hash-123'
      if (key === 'type') return 'recovery'
      return null
    })
    mockVerifyOtp.mockResolvedValue({ data: {}, error: null })

    const user = userEvent.setup()
    render(<ResetPage />)

    // Wait for the password form to appear
    await waitFor(() => {
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/new password/i), 'Password123!')
    await user.type(screen.getByLabelText(/confirm password/i), 'Different123!')
    await user.click(screen.getByRole('button', { name: /update/i }))

    await waitFor(() => {
      expect(screen.getByText(/passwords must match/i)).toBeInTheDocument()
    })
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('AU-T-23b: weak password lacking complexity → strength error; updateUser NOT called', async () => {
    mockSearchParamsGet.mockImplementation((key: string) => {
      if (key === 'token_hash') return 'valid-hash-123'
      if (key === 'type') return 'recovery'
      return null
    })
    mockVerifyOtp.mockResolvedValue({ data: {}, error: null })

    const user = userEvent.setup()
    render(<ResetPage />)

    await waitFor(() => {
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument()
    })

    // Passes the old min-6 rule but fails the shared complexity policy.
    await user.type(screen.getByLabelText(/new password/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /update/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('shows the shared password-requirements checklist on the reset form', async () => {
    mockSearchParamsGet.mockImplementation((key: string) => {
      if (key === 'token_hash') return 'valid-hash-123'
      if (key === 'type') return 'recovery'
      return null
    })
    mockVerifyOtp.mockResolvedValue({ data: {}, error: null })

    render(<ResetPage />)

    await waitFor(() => {
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/include an uppercase letter/i)).toBeInTheDocument()
    expect(screen.getByText(/include a special character/i)).toBeInTheDocument()
  })

  it('AU-T-24: valid passwords → updateUser called → success message + /login navigation', async () => {
    mockSearchParamsGet.mockImplementation((key: string) => {
      if (key === 'token_hash') return 'valid-hash-123'
      if (key === 'type') return 'recovery'
      return null
    })
    mockVerifyOtp.mockResolvedValue({ data: {}, error: null })
    mockUpdateUser.mockResolvedValue({ data: {}, error: null })

    const user = userEvent.setup()
    render(<ResetPage />)

    // Wait for the password form to appear
    await waitFor(() => {
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/new password/i), 'NewPassword123!')
    await user.type(
      screen.getByLabelText(/confirm password/i),
      'NewPassword123!'
    )
    await user.click(screen.getByRole('button', { name: /update/i }))

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({
        password: 'NewPassword123!',
      })
    })

    await waitFor(() => {
      expect(screen.getByText(/password updated/i)).toBeInTheDocument()
    })

    // Navigation to /login — via link or assign
    const loginLink = screen.queryByRole('link', { name: /sign in|login/i })
    if (loginLink) {
      expect(loginLink).toHaveAttribute('href', '/login')
    } else {
      expect(mockAssign).toHaveBeenCalledWith('/login')
    }
  })

  it('AU-T-25: verifyOtp rejects (network failure) → error state, not stuck on loading', async () => {
    mockSearchParamsGet.mockImplementation((key: string) => {
      if (key === 'token_hash') return 'valid-hash-123'
      if (key === 'type') return 'recovery'
      return null
    })
    mockVerifyOtp.mockRejectedValue(new Error('Network down'))

    render(<ResetPage />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(
      screen.queryByText(/verifying your reset link/i)
    ).not.toBeInTheDocument()
    const link = screen.getByRole('link', { name: /forgot.?password|request/i })
    expect(link).toHaveAttribute('href', '/forgot-password')
  })

  it('S-02: StrictMode double-mount → single-use recovery token verified exactly once', async () => {
    mockSearchParamsGet.mockImplementation((key: string) => {
      if (key === 'token_hash') return 'single-use-hash'
      if (key === 'type') return 'recovery'
      return null
    })
    mockVerifyOtp.mockResolvedValue({ data: {}, error: null })

    render(
      <StrictMode>
        <ResetPage />
      </StrictMode>
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument()
    })
    expect(mockVerifyOtp).toHaveBeenCalledTimes(1)
  })
})
