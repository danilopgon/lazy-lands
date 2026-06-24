import type { Metadata } from 'next'

import { AnnouncementBar } from '@/components/layout/announcement-bar'
import { CookieBanner } from '@/components/layout/cookie-banner'
import { LandingPage } from '@/components/landing/landing-page'

// LAND-012: Landing page metadata (indexable — not noindex)
export const metadata: Metadata = {
  title: 'Lazy Lands — Campaign Companion for Dungeon Masters',
  description:
    'Track every NPC, faction and consequence across sessions. ' +
    'Lazy Lands helps Dungeon Masters capture campaign context, validate memories, ' +
    'and generate session briefings — so the world remembers what your players did.',
}

export default function Home() {
  return (
    <>
      {/* Marketing overlays mount here, NOT in layout.tsx,
          so they do not appear on /cookies, /privacy, or app routes. */}
      <AnnouncementBar />
      <main id="main-content">
        <LandingPage />
      </main>
      <CookieBanner />
    </>
  )
}
