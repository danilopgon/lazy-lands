import { describe, expect, it } from 'vitest'

import en from '@/messages/en.json'
import es from '@/messages/es.json'

function collectKeys(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectKeys(item, `${prefix}[${index}]`)
    )
  }

  if (!value || typeof value !== 'object') {
    return [prefix]
  }

  return Object.entries(value).flatMap(([key, child]) =>
    collectKeys(child, prefix ? `${prefix}.${key}` : key)
  )
}

describe('message catalogs', () => {
  it('keeps English and Spanish catalogs structurally aligned', () => {
    expect(collectKeys(es).sort()).toEqual(collectKeys(en).sort())
  })

  it('documents frontend i18n exceptions without translating API payload contracts', () => {
    expect(en.Errors.exceptions).toContain('composeRawText')
    expect(es.Errors.exceptions).toContain('composeRawText')
  })
})
