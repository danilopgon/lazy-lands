import type { ReactElement, ReactNode } from 'react'
import { render as rtlRender, type RenderOptions } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import en from '@/messages/en.json'
import es from '@/messages/es.json'
import type { AppLocale } from '@/i18n/routing'

const catalogs = { en, es } as const

type IntlRenderOptions = RenderOptions & {
  locale?: AppLocale
}

/**
 * Render a UI tree wrapped in `NextIntlClientProvider` so components that call
 * `useTranslations`/`useLocale` resolve against a real locale context — the same
 * way they do under the App Router `[locale]` layout in production.
 *
 * @param {ReactElement} ui - The element under test.
 * @param {IntlRenderOptions} [options] - Testing Library options plus an optional locale (defaults to `en`).
 * @returns {ReturnType<typeof rtlRender>} The Testing Library render result.
 */
export function render(ui: ReactElement, options: IntlRenderOptions = {}) {
  const { locale = 'en', wrapper: InnerWrapper, ...renderOptions } = options

  /**
   * Provider wrapper injected around the element under test. Composes any
   * caller-provided `wrapper` inside the provider instead of letting the spread
   * overwrite it, so the intl context is never silently dropped.
   *
   * @param {{ children: ReactNode }} root0 - Wrapper props.
   * @param {ReactNode} root0.children - The tree to wrap.
   * @returns {React.ReactElement} The wrapped tree.
   */
  function Wrapper({ children }: { children: ReactNode }) {
    const inner = InnerWrapper ? (
      <InnerWrapper>{children}</InnerWrapper>
    ) : (
      children
    )
    return (
      <NextIntlClientProvider locale={locale} messages={catalogs[locale]}>
        {inner}
      </NextIntlClientProvider>
    )
  }

  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions })
}

export * from '@testing-library/react'
