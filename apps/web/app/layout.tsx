import type { Metadata } from 'next'
import {
  Instrument_Sans,
  JetBrains_Mono,
  Source_Serif_4,
} from 'next/font/google'

import './globals.css'

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument-sans',
})

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-source-serif',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
})

export const metadata: Metadata = {
  title: 'Lazy Lands',
  description: 'Campaign Companion for Dungeon Masters',
}

/**
 * Root layout — font variables, skip-link, noscript fallback for scroll animations.
 *
 * @param {object} root0 - The root layout props.
 * @param {React.ReactNode} root0.children - The page content to render inside the layout.
 * @returns {React.ReactElement} The root HTML document element.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light" data-motion="full">
      <body
        className={`${instrumentSans.variable} ${sourceSerif.variable} ${jetbrainsMono.variable}`}
      >
        {/* Without JS, IntersectionObserver never fires and .ll-rise stays opacity:0 */}
        <noscript>
          <style>{`.ll-rise { opacity: 1 !important; transform: none !important; }`}</style>
        </noscript>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-skip-link focus:bg-[var(--accent)] focus:px-4 focus:py-2 focus:font-mono focus:text-xs focus:uppercase focus:tracking-widest focus:text-white"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  )
}
