import '@testing-library/jest-dom/vitest'

// IntersectionObserver is not implemented in jsdom.
// Provide a no-op stub so components that use it (e.g. ViewEnter) render without errors.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: IntersectionObserverStub,
})
