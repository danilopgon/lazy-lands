import { render, screen } from '@/tests/intl'
import { describe, expect, it } from 'vitest'

import { PasswordRequirements } from '@/components/auth/password-requirements'

describe('PasswordRequirements', () => {
  it('announces zero requirements met for an empty value', () => {
    render(<PasswordRequirements value="" />)
    expect(screen.getByText(/0 of 5 requirements met/i)).toBeInTheDocument()
  })

  it('announces the updated count as requirements are satisfied', () => {
    render(<PasswordRequirements value="Password1!" />)
    expect(screen.getByText(/5 of 5 requirements met/i)).toBeInTheDocument()
  })
})
