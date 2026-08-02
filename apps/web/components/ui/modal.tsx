'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { motion, useIsPresent } from 'motion/react'

import { DURATION, EASE } from '@/lib/motion/tokens'
import { useMotionMode } from '@/lib/motion/use-motion-mode'
import { cn } from '@/lib/utils'

type ModalProps = {
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Accessible modal dialog with focus trap, escape key close, and backdrop click close.
 * Renders via portal to document.body and locks body scroll while open.
 *
 * @param {object} root0 - The modal props.
 * @param {string} root0.title - The modal title displayed in the header.
 * @param {() => void} root0.onClose - Callback invoked when the modal should close.
 * @param {React.ReactNode} root0.children - The modal body content.
 * @param {React.ReactNode} [root0.footer] - Optional footer content (typically action buttons).
 * @param {string} [root0.className] - Optional additional CSS classes for the modal panel.
 * @returns {React.ReactPortal} The modal portal element.
 */
export function Modal({
  title,
  onClose,
  children,
  footer,
  className,
}: ModalProps) {
  const { transition } = useMotionMode()
  const isPresent = useIsPresent()
  const titleId = React.useId()
  const modalRef = React.useRef<HTMLDivElement>(null)
  const bodyRef = React.useRef<HTMLDivElement>(null)
  const previousFocusRef = React.useRef<HTMLElement | null>(null)
  const previousOverflowRef = React.useRef('')
  const isReleasedRef = React.useRef(false)
  const focusTimerRef = React.useRef<ReturnType<typeof setTimeout>>(undefined)

  const release = React.useCallback(() => {
    if (isReleasedRef.current) {
      return
    }
    isReleasedRef.current = true
    clearTimeout(focusTimerRef.current)
    document.body.style.overflow = previousOverflowRef.current
    previousFocusRef.current?.focus()

    // Focus left inside would make this subtree unhideable.
    const active = document.activeElement
    if (active instanceof HTMLElement && modalRef.current?.contains(active)) {
      active.blur()
    }
  }, [])

  React.useEffect(() => {
    return () => {
      release()
    }
  }, [release])

  // Layout, not passive: focus must leave before the commit that hides this
  // subtree paints, or the browser refuses to hide it.
  React.useLayoutEffect(() => {
    if (!isPresent) {
      release()
      return
    }

    isReleasedRef.current = false
    previousFocusRef.current = document.activeElement as HTMLElement
    previousOverflowRef.current = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    focusTimerRef.current = setTimeout(() => {
      if (bodyRef.current) {
        const firstFocusable =
          bodyRef.current.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
        if (firstFocusable) {
          firstFocusable.focus()
        } else if (modalRef.current) {
          const firstFocusable =
            modalRef.current.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
          firstFocusable?.focus()
        }
      }
    }, 0)
  }, [isPresent, release])

  React.useEffect(() => {
    if (!isPresent) {
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements =
          modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement?.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement?.focus()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPresent, onClose])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return createPortal(
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[var(--ink)]/60 p-4"
      onMouseDown={handleBackdropClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{
        opacity: 0,
        transition: transition({ duration: DURATION.fast, ease: EASE.in }),
      }}
      transition={transition({ duration: DURATION.fast, ease: EASE.out })}
    >
      <motion.div
        ref={modalRef}
        role={isPresent ? 'dialog' : undefined}
        aria-modal={isPresent ? 'true' : undefined}
        aria-hidden={isPresent ? undefined : true}
        inert={!isPresent}
        aria-labelledby={titleId}
        className={cn(
          'flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col border-2 border-[var(--border)] bg-[var(--paper)] shadow-[6px_6px_0_var(--shadow)]',
          className
        )}
        initial={{ opacity: 0, y: 8, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        // Own transition, or the exit inherits the slower entrance and lands
        // 80ms after the backdrop.
        exit={{
          opacity: 0,
          y: 4,
          scale: 0.99,
          transition: transition({ duration: DURATION.fast, ease: EASE.in }),
        }}
        transition={transition({ duration: DURATION.base, ease: EASE.out })}
      >
        <div className="flex shrink-0 items-center justify-between border-b-2 border-[var(--line)] px-6 py-4">
          <h3
            id={titleId}
            className="font-serif text-xl font-semibold tracking-[-0.015em] text-[var(--ink)]"
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center border-2 border-[var(--border)] bg-[var(--paper)] text-[var(--ink)] shadow-[3px_3px_0_var(--shadow)] transition-transform hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:shadow-[1.5px_1.5px_0_var(--shadow)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
          >
            ✕
          </button>
        </div>
        <div
          ref={bodyRef}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5"
        >
          {children}
        </div>
        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-3 border-t-2 border-[var(--line)] px-6 py-4">
            {footer}
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body
  )
}
