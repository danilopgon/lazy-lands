import { render, screen, waitFor } from '@/tests/intl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockVerifyOtp, mockSearchParamsGet, mockAssign } = vi.hoisted(() => ({
  mockVerifyOtp: vi.fn(),
  mockSearchParamsGet: vi.fn(),
  mockAssign: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { verifyOtp: mockVerifyOtp },
  }),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: mockSearchParamsGet }),
}))

import ConfirmPage from '../page'

describe('ConfirmPage (AU-004)', () => {
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

    render(<ConfirmPage />)

    const link = await screen.findByRole('link', { name: 'Back home' })
    expect(link).toHaveAttribute('href', '/')
  })

  it('AU-T-15: valid token_hash + type → verifyOtp called → redirect to /dashboard', async () => {
    mockSearchParamsGet.mockImplementation((key: string) => {
      if (key === 'token_hash') return 'valid-hash-123'
      if (key === 'type') return 'signup'
      return null
    })
    mockVerifyOtp.mockResolvedValue({ data: {}, error: null })

    render(<ConfirmPage />)

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        token_hash: 'valid-hash-123',
        type: 'signup',
      })
    })
    await waitFor(() => {
      expect(mockAssign).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('AU-T-16: verifyOtp error → error message visible; link to /register present', async () => {
    mockSearchParamsGet.mockImplementation((key: string) => {
      if (key === 'token_hash') return 'expired-hash'
      if (key === 'type') return 'signup'
      return null
    })
    mockVerifyOtp.mockResolvedValue({
      data: { user: null },
      error: { message: 'Token has expired or is invalid' },
    })

    render(<ConfirmPage />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: /register/i })).toBeInTheDocument()
  })

  it('AU-T-17: missing token_hash → error message visible; verifyOtp NOT called', async () => {
    mockSearchParamsGet.mockReturnValue(null)

    render(<ConfirmPage />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(mockVerifyOtp).not.toHaveBeenCalled()
  })

  it('AU-T-17b: token_hash present but type absent → error message visible; verifyOtp NOT called', async () => {
    mockSearchParamsGet.mockImplementation((key: string) => {
      if (key === 'token_hash') return 'valid-hash-123'
      return null
    })

    render(<ConfirmPage />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(mockVerifyOtp).not.toHaveBeenCalled()
  })
})
