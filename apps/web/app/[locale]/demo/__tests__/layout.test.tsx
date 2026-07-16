import { render, screen } from '@/tests/intl'
import { describe, expect, it } from 'vitest'

import { DemoBreadcrumb } from '@/components/demo/demo-breadcrumb'
import { fixturesByLocale } from '@/lib/demo/fixtures'

import DemoLayout from '../layout'

/**
 * Render the async `DemoLayout` server component for a given locale param,
 * with a real demo-owned child that reads the store — proving the seeded
 * fixtures actually reach a consumer, not just the provider's props.
 *
 * @param {string} locale - The route locale to render with.
 * @returns {Promise<ReturnType<typeof render>>} The rendered layout.
 */
async function renderLayout(locale: string) {
  const element = await DemoLayout({
    children: <DemoBreadcrumb title="Test" />,
    params: Promise.resolve({ locale }),
  })
  return render(element)
}

describe('DemoLayout — locale-selected fixtures', () => {
  it('seeds the store from the en bundle for the en locale', async () => {
    await renderLayout('en')

    expect(
      screen.getByRole('link', { name: fixturesByLocale.en.campaign.title })
    ).toBeInTheDocument()
  })

  it('seeds the store from the es bundle for the es locale', async () => {
    await renderLayout('es')

    expect(
      screen.getByRole('link', { name: fixturesByLocale.es.campaign.title })
    ).toBeInTheDocument()
  })

  it('falls back to the en bundle for an unsupported locale', async () => {
    await renderLayout('fr')

    expect(
      screen.getByRole('link', { name: fixturesByLocale.en.campaign.title })
    ).toBeInTheDocument()
  })
})
