'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'

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
  const titleId = React.useId()
  const modalRef = React.useRef<HTMLDivElement>(null)
  const bodyRef = React.useRef<HTMLDivElement>(null)
  const previousFocusRef = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement

    const timer = setTimeout(() => {
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

    return () => {
      clearTimeout(timer)
      previousFocusRef.current?.focus()
    }
  }, [])

  React.useEffect(() => {
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
  }, [onClose])

  React.useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[var(--ink)]/60 p-4 motion-safe:animate-in motion-safe:fade-in motion-reduced:animate-none"
      onMouseDown={handleBackdropClick}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col border-2 border-[var(--border)] bg-[var(--paper)] shadow-[6px_6px_0_var(--shadow)] motion-safe:animate-in motion-safe:zoom-in-95 motion-reduced:animate-none',
          className
        )}
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
      </div>
    </div>,
    document.body
  )
}
