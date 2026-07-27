import { act, render, screen } from '@testing-library/react'
import {
  Children,
  isValidElement,
  type ElementType,
  type ReactNode,
} from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import LocaleLayout from '@/app/[locale]/layout'
import { ExitPresence } from '@/components/motion/exit-presence'
import { ModalPresence } from '@/components/motion/modal-presence'
import {
  DURATION,
  EASE,
  NAV_PENDING_DELAY_MS,
  STAGGER,
} from '@/lib/motion/tokens'
import {
  MotionModeProvider,
  useMotionMode,
  type MotionMode,
} from '@/lib/motion/use-motion-mode'

vi.mock('next/font/google', () => ({
  Instrument_Sans: () => ({ variable: '--font-instrument-sans' }),
  JetBrains_Mono: () => ({ variable: '--font-jetbrains-mono' }),
  Source_Serif_4: () => ({ variable: '--font-source-serif' }),
}))

vi.mock('next-intl/server', () => ({
  getMessages: async () => ({}),
  getTranslations: async () => (key: string) => key,
  setRequestLocale: vi.fn(),
}))

type MatchMediaController = {
  setMatches: (matches: boolean) => void
}

function installReducedMotionPreference(
  initialMatches: boolean
): MatchMediaController {
  let matches = initialMatches
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  const mediaQueryList = {
    get matches() {
      return matches
    },
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: (
      _type: string,
      listener: (event: MediaQueryListEvent) => void
    ) => listeners.add(listener),
    removeEventListener: (
      _type: string,
      listener: (event: MediaQueryListEvent) => void
    ) => listeners.delete(listener),
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => true,
  } as unknown as MediaQueryList

  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mediaQueryList)
  )

  return {
    setMatches(nextMatches) {
      matches = nextMatches
      const event = {
        matches,
        media: mediaQueryList.media,
      } as MediaQueryListEvent
      act(() => listeners.forEach((listener) => listener(event)))
    },
  }
}

function MotionProbe() {
  const { mode, prefersReducedMotion, animationsEnabled, transition } =
    useMotionMode()
  const resolvedTransition = transition({
    duration: DURATION.base,
    ease: EASE.out,
  })

  return (
    <output
      data-testid="motion-probe"
      data-mode={mode}
      data-reduced={String(prefersReducedMotion)}
      data-enabled={String(animationsEnabled)}
      data-duration={String(resolvedTransition.duration)}
      data-ease={JSON.stringify(resolvedTransition.ease)}
    />
  )
}

function renderMotionProbe(mode: MotionMode) {
  return render(
    <MotionModeProvider mode={mode}>
      <MotionProbe />
    </MotionModeProvider>
  )
}

function findElementByType(
  node: ReactNode,
  type: ElementType
): React.ReactElement | null {
  if (!isValidElement<{ children?: ReactNode }>(node)) {
    return null
  }

  if (node.type === type) {
    return node
  }

  for (const child of Children.toArray(node.props.children)) {
    const match = findElementByType(child, type)
    if (match) return match
  }

  return null
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('motion tokens', () => {
  it('exports the binding Unit 3 motion vocabulary without a spring token', () => {
    expect(DURATION).toEqual({ instant: 0, fast: 0.14, base: 0.22, slow: 0.26 })
    expect(EASE).toEqual({
      out: [0.16, 1, 0.3, 1],
      in: [0.4, 0, 1, 1],
    })
    expect(STAGGER).toEqual({ tight: 0.04, base: 0.06 })
    expect(NAV_PENDING_DELAY_MS).toBe(150)
    expect(DURATION).not.toHaveProperty('spring')
  })
})

describe('useMotionMode', () => {
  it('preserves token duration and easing for full motion', () => {
    installReducedMotionPreference(false)
    renderMotionProbe('full')

    expect(screen.getByTestId('motion-probe')).toHaveAttribute(
      'data-duration',
      String(DURATION.base)
    )
    expect(screen.getByTestId('motion-probe')).toHaveAttribute(
      'data-ease',
      JSON.stringify(EASE.out)
    )
    expect(screen.getByTestId('motion-probe')).toHaveAttribute(
      'data-enabled',
      'true'
    )
  })

  it.each(['subtle', 'off'] as const)(
    'resolves transitions instantly for %s mode',
    (mode) => {
      installReducedMotionPreference(false)
      renderMotionProbe(mode)

      expect(screen.getByTestId('motion-probe')).toHaveAttribute(
        'data-duration',
        String(DURATION.instant)
      )
      expect(screen.getByTestId('motion-probe')).toHaveAttribute(
        'data-enabled',
        'false'
      )
    }
  )

  it('resolves transitions instantly when the OS requests reduced motion', () => {
    installReducedMotionPreference(true)
    renderMotionProbe('full')

    expect(screen.getByTestId('motion-probe')).toHaveAttribute(
      'data-reduced',
      'true'
    )
    expect(screen.getByTestId('motion-probe')).toHaveAttribute(
      'data-duration',
      String(DURATION.instant)
    )
  })

  it('reacts when the OS reduced-motion preference changes', () => {
    const media = installReducedMotionPreference(false)
    renderMotionProbe('full')

    expect(screen.getByTestId('motion-probe')).toHaveAttribute(
      'data-duration',
      String(DURATION.base)
    )

    media.setMatches(true)

    expect(screen.getByTestId('motion-probe')).toHaveAttribute(
      'data-duration',
      String(DURATION.instant)
    )
  })

  it('uses false as the reduced-motion server snapshot', () => {
    installReducedMotionPreference(true)

    const html = renderToString(
      <MotionModeProvider mode="full">
        <MotionProbe />
      </MotionModeProvider>
    )

    expect(html).toContain('data-reduced="false"')
    expect(html).toContain(`data-duration="${DURATION.base}"`)
  })
})

describe('LocaleLayout motion mode', () => {
  it.each([
    { visualRegression: 'false', expectedMode: 'full' },
    { visualRegression: 'true', expectedMode: 'off' },
  ] as const)(
    'passes $expectedMode to both html and MotionModeProvider',
    async ({ visualRegression, expectedMode }) => {
      vi.stubEnv('VISUAL_REGRESSION_TEST_MODE', visualRegression)

      const layout = await LocaleLayout({
        children: <main>Campaign chronicle</main>,
        params: Promise.resolve({ locale: 'en' }),
      })
      const provider = findElementByType(layout, MotionModeProvider)

      expect(layout.props['data-motion']).toBe(expectedMode)
      expect(provider?.props).toMatchObject({ mode: expectedMode })
    }
  )
})

describe('motion presence scaffolding', () => {
  it('keeps modal content mounted only while open', () => {
    const { rerender } = render(
      <ModalPresence open>
        <p>Modal ledger</p>
      </ModalPresence>
    )

    expect(screen.getByText('Modal ledger')).toBeInTheDocument()

    rerender(
      <ModalPresence open={false}>
        <p>Modal ledger</p>
      </ModalPresence>
    )

    expect(screen.queryByText('Modal ledger')).not.toBeInTheDocument()
  })

  it('renders keyed exit-presence children without changing their content', () => {
    render(
      <ExitPresence>
        <p key="first">First memory</p>
        <p key="second">Second memory</p>
      </ExitPresence>
    )

    expect(screen.getAllByText(/memory$/)).toHaveLength(2)
  })
})
