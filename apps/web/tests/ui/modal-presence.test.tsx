import { useState } from 'react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ModalPresence } from '@/components/motion/modal-presence'
import { Modal } from '@/components/ui/modal'
import {
  MotionModeProvider,
  type MotionMode,
} from '@/lib/motion/use-motion-mode'
import { DURATION } from '@/lib/motion/tokens'

const EXIT_MS = DURATION.fast * 1000

/**
 * Render a modal whose conditional subtree sits UNDER a presence boundary.
 *
 * The boundary has to outlive the condition: an `AnimatePresence` placed inside
 * the conditional is unmounted by the very state change it would animate, so it
 * can never run a close transition.
 *
 * @param {object} root0 - Harness props.
 * @param {MotionMode} root0.mode - App motion mode under test.
 * @returns {React.ReactElement} The harness element.
 */
function ModalHarness({ mode }: { mode: MotionMode }) {
  const [open, setOpen] = useState(true)

  return (
    <MotionModeProvider mode={mode}>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <ModalPresence open={open}>
        <Modal key="entity" title="Edit NPC" onClose={() => setOpen(false)}>
          <p>Panel body</p>
        </Modal>
      </ModalPresence>
    </MotionModeProvider>
  )
}

describe('Modal presence', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps the panel mounted through its exit under full motion', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<ModalHarness mode="full" />)

    await user.keyboard('{Escape}')

    expect(screen.getByText('Panel body')).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(EXIT_MS * 2)
    })

    expect(screen.queryByText('Panel body')).not.toBeInTheDocument()
  })

  it.each(['subtle', 'off'] as const)(
    'resolves the exit instantly under data-motion="%s"',
    async (mode) => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<ModalHarness mode={mode} />)

      await user.keyboard('{Escape}')
      await act(async () => {
        vi.advanceTimersByTime(0)
      })

      expect(screen.queryByText('Panel body')).not.toBeInTheDocument()
    }
  )

  it('re-arms focus and the scroll lock when a modal reopens mid-exit', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<ModalHarness mode="full" />)

    await user.keyboard('{Escape}')
    expect(document.body.style.overflow).toBe('')

    // Back before the exit finished: presence may hand the same instance back
    // rather than remounting it, so the lock has to be re-acquired.
    await user.click(screen.getByRole('button', { name: 'Open' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('stops presenting a closing dialog as a live dialog', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<ModalHarness mode="full" />)

    await user.keyboard('{Escape}')

    // Still on screen for its exit, but no longer a dialog: a second modal may
    // legitimately open during this window, and two live dialogs would fight
    // over focus, Escape, and the scroll lock.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Panel body')).toBeInTheDocument()
  })

  it('releases focus and the scroll lock when the exit starts', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<ModalHarness mode="full" />)

    await user.keyboard('{Escape}')

    expect(document.body.style.overflow).toBe('')
  })

  it('restores body scroll once the exit completes', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<ModalHarness mode="off" />)

    expect(document.body.style.overflow).toBe('hidden')

    await user.keyboard('{Escape}')
    await act(async () => {
      vi.advanceTimersByTime(EXIT_MS * 2)
    })

    expect(document.body.style.overflow).toBe('')
  })
})
