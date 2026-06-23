import { render, screen } from '@testing-library/react'

import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('renders button children as its accessible name', () => {
    render(<Button>Save changes</Button>)

    expect(
      screen.getByRole('button', { name: 'Save changes' })
    ).toBeInTheDocument()
  })

  it('accepts a variant prop while preserving button behavior', () => {
    render(<Button variant="secondary">Review proposal</Button>)

    expect(
      screen.getByRole('button', { name: 'Review proposal' })
    ).toBeEnabled()
  })
})
