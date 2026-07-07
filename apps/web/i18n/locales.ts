import type { AppLocale } from './routing'

type LocaleMeta = {
  /** Endonym shown in the open dropdown (the language named in its own tongue). */
  label: string
  /** Two-letter code shown on the collapsed trigger. */
  short: string
}

/**
 * Display metadata for each supported locale, keyed by {@link AppLocale} so that
 * adding a locale to `routing.locales` raises a type error here until its label
 * is supplied. The language switcher renders from this map, never from a
 * hardcoded pair, so it scales to any number of locales without layout changes.
 */
export const localeMeta: Record<AppLocale, LocaleMeta> = {
  en: { label: 'English', short: 'EN' },
  es: { label: 'Español', short: 'ES' },
}
