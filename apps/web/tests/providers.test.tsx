import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useQueryClient } from '@tanstack/react-query'
import { Providers } from '@/providers'

/**
 * Minimal consumer that proves QueryClientProvider is wired.
 * useQueryClient throws if no QueryClient is found in context.
 *
 * @returns {React.ReactElement} A span indicating QueryClient availability.
 */
function QueryClientProbe() {
  const client = useQueryClient()
  return <span data-testid="probe">{client ? 'connected' : 'missing'}</span>
}

describe('Providers — TanStack Query setup (AU-003)', () => {
  it('provides a QueryClient to the component tree', () => {
    render(
      <Providers>
        <QueryClientProbe />
      </Providers>
    )

    expect(screen.getByTestId('probe')).toHaveTextContent('connected')
  })

  it('renders children inside the provider', () => {
    render(
      <Providers>
        <p data-testid="child">hello</p>
      </Providers>
    )

    expect(screen.getByTestId('child')).toBeInTheDocument()
  })
})
