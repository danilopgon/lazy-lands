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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light" data-motion="full">
      <body
        className={`${instrumentSans.variable} ${sourceSerif.variable} ${jetbrainsMono.variable}`}
      >
        {children}
      </body>
    </html>
  )
}
