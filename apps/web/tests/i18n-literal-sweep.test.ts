import { readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

import en from '@/messages/en.json'
import es from '@/messages/es.json'

const productionFiles = [
  'app/[locale]/dashboard/page.tsx',
  'components/campaigns/campaign-list.tsx',
  'components/campaigns/campaign-card.tsx',
  'components/layout/cookie-banner.tsx',
  'components/landing/public-top.tsx',
  'components/auth/auth-card.tsx',
  'components/auth/password-requirements.tsx',
  'lib/auth/password.ts',
]

const rawUiLiterals = [
  'Your chronicles',
  'Something went wrong while loading your campaigns.',
  'Search campaigns',
  'Your chronicle starts here',
  'No campaigns match that search',
  'Open chronicle →',
  'Updated {date}',
  'This site uses local storage to remember cookie consent',
  'Accept cookies',
  'Sign in',
  'Start your chronicle',
  'Password must be at least 8 characters',
  'Passwords must match',
]

function fileText(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8')
}

function flatten(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (!value || typeof value !== 'object') return []
  return Object.values(value).flatMap(flatten)
}

describe('frontend literal sweep', () => {
  it('has English and Spanish catalog entries for representative public, auth, dashboard, legal, and state copy', () => {
    for (const literal of rawUiLiterals) {
      expect(
        flatten(en),
        `missing English catalog entry: ${literal}`
      ).toContain(literal)
    }

    expect(flatten(es)).toContain('Tus crónicas')
    expect(flatten(es)).toContain('Aceptar cookies')
    expect(flatten(es)).toContain('Las contraseñas deben coincidir')
  })

  it('keeps inventoried user-facing strings out of production source', () => {
    const findings = productionFiles.flatMap((path) => {
      const source = fileText(path)
      return rawUiLiterals.flatMap((literal) => {
        if (!source.includes(literal)) return []
        return `${relative(process.cwd(), join(process.cwd(), path))}: ${literal}`
      })
    })

    expect(findings).toEqual([])
  })
})
