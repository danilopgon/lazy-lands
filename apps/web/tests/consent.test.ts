import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// These tests are written BEFORE the implementation (TDD RED phase).
// They cover LEGAL-003a/b/c from spec.

describe('consent.ts', () => {
  const store = new Map<string, string>()
  const localStorageMock = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, String(v))
    },
    removeItem: (k: string) => {
      store.delete(k)
    },
    clear: () => store.clear(),
  }

  beforeEach(() => {
    store.clear()
    vi.stubGlobal('localStorage', localStorageMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  describe('LEGAL-003a — getConsent() returns null when key absent', () => {
    it('returns null when ll-cookie-consent is not set', async () => {
      const { getConsent } = await import('@/lib/consent')
      expect(getConsent()).toBeNull()
    })
  })

  describe('LEGAL-003b — setConsent() writes "acknowledged"', () => {
    it('sets ll-cookie-consent to "acknowledged"', async () => {
      const { setConsent } = await import('@/lib/consent')
      setConsent()
      expect(localStorageMock.getItem('ll-cookie-consent')).toBe('acknowledged')
    })
  })

  describe('LEGAL-003c — SSR safety: module does not throw when window is undefined', () => {
    it('does not throw when window is undefined', async () => {
      vi.stubGlobal('window', undefined)
      vi.resetModules()
      const {
        getConsent,
        setConsent,
        getAnnouncementDismissed,
        setAnnouncementDismissed,
      } = await import('@/lib/consent')
      expect(() => getConsent()).not.toThrow()
      expect(() => setConsent()).not.toThrow()
      expect(() => getAnnouncementDismissed()).not.toThrow()
      expect(() => setAnnouncementDismissed()).not.toThrow()
    })
  })

  describe('getAnnouncementDismissed() and setAnnouncementDismissed()', () => {
    it('returns false when ll-announcement-dismissed is not set', async () => {
      const { getAnnouncementDismissed } = await import('@/lib/consent')
      expect(getAnnouncementDismissed()).toBe(false)
    })

    it('sets ll-announcement-dismissed and getAnnouncementDismissed returns true', async () => {
      const { setAnnouncementDismissed, getAnnouncementDismissed } =
        await import('@/lib/consent')
      setAnnouncementDismissed()
      expect(getAnnouncementDismissed()).toBe(true)
    })
  })

  describe('exported constants', () => {
    it('exports CONSENT_KEY as "ll-cookie-consent"', async () => {
      const { CONSENT_KEY } = await import('@/lib/consent')
      expect(CONSENT_KEY).toBe('ll-cookie-consent')
    })

    it('exports ANNOUNCEMENT_KEY as "ll-announcement-dismissed"', async () => {
      const { ANNOUNCEMENT_KEY } = await import('@/lib/consent')
      expect(ANNOUNCEMENT_KEY).toBe('ll-announcement-dismissed')
    })
  })
})
