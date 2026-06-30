'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

// The graph scene is desktop-only and purely decorative. CSS `hidden llg:block`
// would still ship Motion in the client bundle, hydrate the scene and subscribe
// `useScroll` on phones that never see it. So we lazy-load it (its own chunk,
// motion included) and only mount it once the llg breakpoint actually matches —
// mobile never downloads or runs the animation code.
const HeroGraphScene = dynamic(
  () => import('./hero-graph-scene').then((m) => m.HeroGraphScene),
  { ssr: false }
)

/**
 * Desktop-only lazy-loaded wrapper for the animated hero graph scene.
 *
 * @returns {React.ReactElement} The hero graph slot element, visible only on desktop breakpoints.
 */
export function HeroGraphSlot() {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 901px)')
    const sync = () => setIsDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // The wrapper keeps the square grid cell reserved on desktop (so the scene
  // mounting in causes no layout shift); it stays display:none below llg.
  return (
    <div className="hidden aspect-square w-full self-center llg:block">
      {isDesktop && <HeroGraphScene />}
    </div>
  )
}
