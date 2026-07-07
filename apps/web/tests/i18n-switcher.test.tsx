import type { ReactNode } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { render, screen, waitFor } from '@/tests/intl'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import en from '@/messages/en.json'
import es from '@/messages/es.json'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { PublicTop } from '@/components/landing/public-top'

const { mockRouterPush, mockUpdateUser } = vi.hoisted(() => ({
  mockRouterPush: vi.fn(),
  mockUpdateUser: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => window.location.pathname || '/',
  useSearchParams: () => new URLSearchParams(window.location.search),
  useParams: () => ({}),
  useSelectedLayoutSegment: () => null,
  useSelectedLayoutSegments: () => [],
  redirect: () => {
    throw new Error('NEXT_REDIRECT')
  },
  permanentRedirect: () => {
    throw new Error('NEXT_REDIRECT')
  },
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
  RedirectType: { push: 'push', replace: 'replace' },
  ReadonlyURLSearchParams: URLSearchParams,
}))

vi.mock('next/link', async () => {
  const { createElement } = await import('react')
  return {
    default: ({
      href,
      children,
      ...props
    }: {
      href: string
      children?: ReactNode
    }) => createElement('a', { href, ...props }, children),
  }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { updateUser: mockUpdateUser },
  }),
}))

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

  it('does not persist user metadata for the default public language switcher', async () => {
    const user = userEvent.setup()
    window.history.pushState(null, '', '/dashboard?x=1')

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <LanguageSwitcher />
      </NextIntlClientProvider>
    )

    const spanishLink = screen.getByRole('link', { name: /español/i })
    spanishLink.addEventListener('click', (event) => event.preventDefault())

    await user.click(spanishLink)

    expect(mockUpdateUser).not.toHaveBeenCalled()
    expect(mockRouterPush).not.toHaveBeenCalled()
  })

  it('persists Spanish user metadata before enhanced dashboard navigation', async () => {
    const user = userEvent.setup()
    mockUpdateUser.mockResolvedValue({ data: { user: {} }, error: null })
    window.history.pushState(null, '', '/dashboard?x=1')

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <LanguageSwitcher persistUserLanguage />
      </NextIntlClientProvider>
    )

    await user.click(screen.getByRole('link', { name: /español/i }))

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({
        data: { language: 'es' },
      })
    })
    expect(mockRouterPush).toHaveBeenCalledWith('/es/dashboard?x=1')
  })

  it('still navigates when dashboard language persistence fails', async () => {
    const user = userEvent.setup()
    mockUpdateUser.mockRejectedValue(new Error('Supabase unavailable'))
    window.history.pushState(null, '', '/dashboard?x=1')

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <LanguageSwitcher persistUserLanguage />
      </NextIntlClientProvider>
    )

    await user.click(screen.getByRole('link', { name: /español/i }))

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/es/dashboard?x=1')
    })
  })
})
