'use client'

import type { Transition } from 'motion/react'
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

import { DURATION } from '@/lib/motion/tokens'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export type MotionMode = 'full' | 'subtle' | 'off'

type MotionModeContextValue = {
  mode: MotionMode
  prefersReducedMotion: boolean
  animationsEnabled: boolean
  transition: (transition?: Transition) => Transition
}

type MotionModeProviderProps = {
  children: ReactNode
  mode: MotionMode
}

const MotionModeContext = createContext<MotionModeContextValue | null>(null)

/**
 * Read the current browser reduced-motion preference.
 *
 * @returns {boolean} Whether the OS requests reduced motion.
 */
function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

/**
 * Keep the server snapshot deterministic for hydration.
 *
 * @returns {false} The server-safe reduced-motion fallback.
 */
function getReducedMotionServerSnapshot() {
  return false
}

/**
 * Subscribe React to browser reduced-motion preference changes.
 *
 * @param {() => void} onStoreChange - React external-store notifier.
 * @returns {() => void} Subscription cleanup.
 */
function subscribeToReducedMotion(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY)
  mediaQuery.addEventListener('change', onStoreChange)

  return () => mediaQuery.removeEventListener('change', onStoreChange)
}

/**
 * Provide the app motion mode and reactive OS reduced-motion preference.
 *
 * @param {MotionModeProviderProps} root0 - Provider props.
 * @param {ReactNode} root0.children - Descendant application tree.
 * @param {MotionMode} root0.mode - App-level mode shared with the html attribute.
 * @returns {React.ReactElement} Motion mode context provider.
 */
export function MotionModeProvider({
  children,
  mode,
}: MotionModeProviderProps) {
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  )
  const animationsEnabled = mode === 'full' && !prefersReducedMotion
  const transition = useCallback(
    (value: Transition = {}): Transition =>
      animationsEnabled ? value : { duration: DURATION.instant },
    [animationsEnabled]
  )
  const context = useMemo(
    () => ({
      mode,
      prefersReducedMotion,
      animationsEnabled,
      transition,
    }),
    [animationsEnabled, mode, prefersReducedMotion, transition]
  )

  return createElement(MotionModeContext.Provider, { value: context }, children)
}

/**
 * Read the effective Motion transition policy for the current app mode.
 *
 * @returns {MotionModeContextValue} App mode, reduced-motion state, and transition resolver.
 * @throws {Error} When rendered outside MotionModeProvider.
 */
export function useMotionMode(): MotionModeContextValue {
  const context = useContext(MotionModeContext)

  if (!context) {
    throw new Error('useMotionMode must be used within MotionModeProvider')
  }

  return context
}
