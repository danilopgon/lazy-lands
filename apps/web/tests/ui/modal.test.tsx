import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Modal } from '@/components/ui/modal'

describe('Modal', () => {
  const defaultProps = {
    title: 'Confirm Action',
    onClose: vi.fn(),
    children: <p>Are you sure?</p>,
  }

  it('renders the title in a heading', () => {
    render(<Modal {...defaultProps} />)

    expect(
      screen.getByRole('heading', { name: 'Confirm Action' })
    ).toBeInTheDocument()
  })

  it('renders children in the body', () => {
    render(<Modal {...defaultProps} />)

    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
  })

  it('renders close button with aria-label', () => {
    render(<Modal {...defaultProps} />)

    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Modal {...defaultProps} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when Escape key is pressed', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Modal {...defaultProps} onClose={onClose} />)

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Modal {...defaultProps} onClose={onClose} />)

    const backdrop = screen.getByRole('dialog').parentElement!
    await user.click(backdrop)

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not call onClose when inner content is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Modal {...defaultProps} onClose={onClose} />)

    await user.click(screen.getByText('Are you sure?'))

    expect(onClose).not.toHaveBeenCalled()
  })

  it('renders footer when provided', () => {
    render(
      <Modal {...defaultProps} footer={<button>Save</button>}>
        <p>Content</p>
      </Modal>
    )

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('does not render footer when not provided', () => {
    render(<Modal {...defaultProps} />)

    expect(
      screen.queryByRole('button', { name: 'Save' })
    ).not.toBeInTheDocument()
  })

  it('has role="dialog" and aria-modal="true"', () => {
    render(<Modal {...defaultProps} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('has aria-labelledby pointing to the title', () => {
    render(<Modal {...defaultProps} />)

    const dialog = screen.getByRole('dialog')
    const labelledBy = dialog.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()

    const titleElement = document.getElementById(labelledBy!)
    expect(titleElement).toHaveTextContent('Confirm Action')
  })

  it('locks body scroll when open', () => {
    render(<Modal {...defaultProps} />)

    expect(document.body.style.overflow).toBe('hidden')
  })

  it('restores body scroll when closed', () => {
    const { unmount } = render(<Modal {...defaultProps} />)

    unmount()

    expect(document.body.style.overflow).toBe('')
  })

  it('traps focus within the modal', async () => {
    const user = userEvent.setup()
    render(
      <Modal
        {...defaultProps}
        footer={
          <>
            <button>Cancel</button>
            <button>Confirm</button>
          </>
        }
      >
        <input data-testid="input" />
      </Modal>
    )

    const input = screen.getByTestId('input')
    const cancelButton = screen.getByRole('button', { name: 'Cancel' })
    const confirmButton = screen.getByRole('button', { name: 'Confirm' })
    const closeButton = screen.getByRole('button', { name: 'Close' })

    await waitFor(() => {
      expect(document.activeElement).toBe(input)
    })

    await user.tab()
    expect(document.activeElement).toBe(cancelButton)

    await user.tab()
    expect(document.activeElement).toBe(confirmButton)

    await user.tab()
    expect(document.activeElement).toBe(closeButton)

    await user.tab()
    expect(document.activeElement).toBe(input)
  })

  it('wraps focus backward with Shift+Tab', async () => {
    const user = userEvent.setup()
    render(
      <Modal {...defaultProps} footer={<button>Save</button>}>
        <input data-testid="input" />
      </Modal>
    )

    const input = screen.getByTestId('input')
    const closeButton = screen.getByRole('button', { name: 'Close' })

    await waitFor(() => {
      expect(document.activeElement).toBe(input)
    })

    await user.tab({ shift: true })
    expect(document.activeElement).toBe(closeButton)
  })

  it('renders via portal to document.body', () => {
    render(<Modal {...defaultProps} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog.parentElement?.parentElement).toBe(document.body)
  })
})
