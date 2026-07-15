import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const appRoot = process.cwd()

describe('web ESLint configuration', () => {
  it('uses the ESLint CLI instead of the removed Next.js lint command', () => {
    const packageJson = JSON.parse(
      readFileSync(join(appRoot, 'package.json'), 'utf8')
    ) as { scripts: Record<string, string> }

    expect(packageJson.scripts.lint).toContain('eslint .')
  })

  it('fails the lint gate on any warning', () => {
    const packageJson = JSON.parse(
      readFileSync(join(appRoot, 'package.json'), 'utf8')
    ) as { scripts: Record<string, string> }

    expect(packageJson.scripts.lint).toContain('--max-warnings 0')
  })

  it('uses a flat ESLint config for Next.js 16 and ESLint 9', () => {
    const flatConfigPath = join(appRoot, 'eslint.config.mjs')

    expect(existsSync(flatConfigPath)).toBe(true)

    const flatConfig = readFileSync(flatConfigPath, 'utf8')
    expect(flatConfig).toContain('next/core-web-vitals')
    expect(flatConfig).toContain('next/typescript')
    expect(flatConfig).toContain('.next/**')
  })
})
