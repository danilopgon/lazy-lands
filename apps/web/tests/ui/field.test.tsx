import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Field } from '@/components/ui/field'

describe('Field', () => {
  it('renders the label text', () => {
    render(
      <Field label="Campaign name">
        <input />
      </Field>
    )

    expect(screen.getByText('Campaign name')).toBeInTheDocument()
  })

  it('applies mono uppercase styling to the label', () => {
    render(
      <Field label="Campaign name">
        <input />
      </Field>
    )

    const label = screen.getByText('Campaign name')
    expect(label).toHaveClass('font-mono', 'uppercase')
  })

  it('shows optional marker when optional prop is true', () => {
    render(
      <Field label="Description" optional>
        <input />
      </Field>
    )

    expect(screen.getByText('· optional')).toBeInTheDocument()
  })

  it('does not show optional marker when optional prop is false', () => {
    render(
      <Field label="Description">
        <input />
      </Field>
    )

    expect(screen.queryByText('· optional')).not.toBeInTheDocument()
  })

  it('renders children (the form control)', () => {
    render(
      <Field label="Email">
        <input data-testid="email-input" />
      </Field>
    )

    expect(screen.getByTestId('email-input')).toBeInTheDocument()
  })

  it('shows help text when help prop is provided and no error', () => {
    render(
      <Field label="Email" help="Enter your email address">
        <input />
      </Field>
    )

    expect(screen.getByText('Enter your email address')).toBeInTheDocument()
  })

  it('does not show help text when error is present', () => {
    render(
      <Field
        label="Email"
        help="Enter your email address"
        error="Email is required"
      >
        <input />
      </Field>
    )

    expect(
      screen.queryByText('Enter your email address')
    ).not.toBeInTheDocument()
  })

  it('shows error text when error prop is provided', () => {
    render(
      <Field label="Email" error="Email is required">
        <input />
      </Field>
    )

    expect(screen.getByText('Email is required')).toBeInTheDocument()
  })

  it('error text has role="alert" for screen readers', () => {
    render(
      <Field label="Email" error="Email is required">
        <input />
      </Field>
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Email is required')
  })

  it('wires aria-describedby to help text', () => {
    render(
      <Field label="Email" help="Enter your email">
        <input data-testid="input" />
      </Field>
    )

    const input = screen.getByTestId('input')
    const describedBy = input.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()

    const helpElement = document.getElementById(describedBy!)
    expect(helpElement).toHaveTextContent('Enter your email')
  })

  it('wires aria-describedby to error text when error is present', () => {
    render(
      <Field label="Email" error="Required" help="Enter your email">
        <input data-testid="input" />
      </Field>
    )

    const input = screen.getByTestId('input')
    const describedBy = input.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()

    const errorElement = document.getElementById(describedBy!)
    expect(errorElement).toHaveTextContent('Required')
  })

  it('applies error styling to error text', () => {
    render(
      <Field label="Email" error="Required">
        <input />
      </Field>
    )

    const errorElement = screen.getByRole('alert')
    expect(errorElement).toHaveClass('text-[var(--danger)]')
  })
})
