import '@testing-library/jest-dom/vitest'
import { createElement, type ReactNode } from 'react'
import { vi } from 'vitest'

// jsdom has no App Router context, so the client navigation hooks throw when a
// component (e.g. LanguageSwitcher via next-intl navigation) reads them. Back
// them with `window.location`, which tests drive through `history.pushState`.
// Kept self-contained (no `importOriginal`) because spreading the real module
// makes next-intl's internal `next/navigation` import fail to resolve under
// pnpm. Test files that need a navigation spy provide their own `vi.mock`,
// which overrides this default for that file.
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
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

// next-intl's `createNavigation` imports `next/navigation` with a bare
// specifier that vitest cannot resolve from next-intl's nested pnpm location.
// Mock the app's navigation wrapper directly so `createNavigation` never runs;
// `buildLocalizedPath` normalizes the raw (locale-prefixed) pathname, so an
// un-stripped `usePathname` is fine here. Files needing a spy override this.
vi.mock('@/i18n/navigation', () => ({
  usePathname: () => window.location.pathname || '/',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  redirect: () => {
    throw new Error('NEXT_REDIRECT')
  },
  getPathname: () => window.location.pathname || '/',
  // Render a plain anchor so href assertions match. In production this is
  // next-intl's locale-aware Link; under the default 'en' locale the two agree
  // (unprefixed), which is what the tests render with.
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string
    children?: ReactNode
  }) => createElement('a', { href, ...props }, children),
}))

// IntersectionObserver is not implemented in jsdom.
// Provide a no-op stub so components that use it (e.g. ViewEnter) render without errors.
/** jsdom lacks IntersectionObserver — this stub prevents components from throwing during render. */
class IntersectionObserverStub {
  /** No-op: jsdom does not implement observation. */
  observe() {}
  /** No-op: nothing to unobserve in a stub. */
  unobserve() {}
  /** No-op: no observers to disconnect. */
  disconnect() {}
}

Object.defineProperty(globalThis, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: IntersectionObserverStub,
})

// matchMedia is not implemented in jsdom. Components that branch on a media
// query (e.g. HeroGraphSlot, which mounts the graph only on desktop) call it
// during effects, so provide a stub that reports "no match" (mobile-like).
Object.defineProperty(globalThis, 'matchMedia', {
  writable: true,
  configurable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false
    },
  }),
})
