import '@testing-library/jest-dom/vitest'

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
