import { render, screen } from '@/tests/intl'
import { describe, it, expect } from 'vitest'

import { HeroGraphScene } from '@/components/landing/hero-graph-scene'

// Issue #42 — the hero relationship graph must localize every user-facing
// string through the i18n catalog instead of rendering hardcoded English.
describe('HeroGraphScene i18n (#42)', () => {
  it('renders English catalog copy under the en locale', () => {
    render(<HeroGraphScene />, { locale: 'en' })

    expect(screen.getByText('Party')).toBeInTheDocument()
    expect(screen.getByText('The Quiet Ledger')).toBeInTheDocument()
    expect(screen.getByText('circling closer')).toBeInTheDocument()
    expect(screen.getByText('memory in play')).toBeInTheDocument()
    expect(
      screen.getByText('Halia favors two of them, and distrusts the other two.')
    ).toBeInTheDocument()
  })

  it('renders Spanish catalog copy under the es locale', () => {
    render(<HeroGraphScene />, { locale: 'es' })

    expect(screen.getByText('Grupo')).toBeInTheDocument()
    expect(screen.getByText('El Registro Silencioso')).toBeInTheDocument()
    expect(screen.getByText('cerrando el cerco')).toBeInTheDocument()
    expect(screen.getByText('memoria en juego')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Halia favorece a dos de ellos y desconfía de los otros dos.'
      )
    ).toBeInTheDocument()
  })

  it('does not leak hardcoded English into the Spanish render', () => {
    render(<HeroGraphScene />, { locale: 'es' })

    expect(screen.queryByText('The Quiet Ledger')).not.toBeInTheDocument()
    expect(screen.queryByText('circling closer')).not.toBeInTheDocument()
    expect(screen.queryByText('memory in play')).not.toBeInTheDocument()
  })
})
