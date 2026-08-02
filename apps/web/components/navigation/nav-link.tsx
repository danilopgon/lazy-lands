'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useLinkStatus } from 'next/link'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { NAV_PENDING_DELAY_MS } from '@/lib/motion/tokens'

import type { LinkPendingProps, LocaleLinkProps, NavLinkProps } from './types'

const SLOT_CLASS_NAME = 'ml-1 inline-block w-[1em] text-center align-baseline'

/**
 * Decide whether a destination is handled by the client router.
 *
 * @param {LocaleLinkProps['href']} href - The link destination.
 * @returns {boolean} Whether the destination is an in-app route.
 */
function isInAppHref(href: LocaleLinkProps['href']): boolean {
  if (typeof href !== 'string') {
    return true
  }

  return !href.startsWith('#') && !/^[a-z][a-z\d+\-.]*:|^\/\//i.test(href)
}

/**
 * Read this link's own navigation status and surface it after a grace period.
 *
 * MUST render inside Next's `<Link>`: elsewhere `useLinkStatus` silently
 * reports idle rather than failing.
 *
 * @param {object} root0 - Reader props.
 * @param {string} root0.label - Screen-reader announcement while navigating.
 * @param {string} root0.slotClassName - Placement classes for the status slot.
 * @returns {React.ReactElement} The reserved status slot.
 */
function LinkPending({ label, slotClassName }: LinkPendingProps) {
  const { pending } = useLinkStatus()
  const [hasGraceElapsed, setHasGraceElapsed] = useState(false)
  const isVisible = pending && hasGraceElapsed

  useEffect(() => {
    if (!pending) {
      return
    }

    const timer = window.setTimeout(
      () => setHasGraceElapsed(true),
      NAV_PENDING_DELAY_MS
    )

    return () => {
      window.clearTimeout(timer)
      setHasGraceElapsed(false)
    }
  }, [pending])

  // `aria-live`, not `role="status"`: a status node in all 73 links would make
  // every unnamed `getByRole('status')` ambiguous.
  return (
    <span
      aria-live="polite"
      aria-atomic="true"
      data-testid="nav-link-pending"
      className={slotClassName}
    >
      {isVisible ? (
        <>
          <span aria-hidden="true" className="ll-quill inline-block">
            ✒
          </span>
          <span className="sr-only">{label}</span>
        </>
      ) : null}
    </span>
  )
}

/**
 * Locale-aware application link that reports its own navigation as pending.
 *
 * @param {NavLinkProps} root0 - Link props.
 * @param {ReactNode} root0.children - The link label content.
 * @param {string} [root0.pendingLabel] - Optional announcement override.
 * @param {string} [root0.pendingSlotClassName] - Optional status-slot placement override.
 * @returns {React.ReactElement} The link element.
 */
export function NavLink({
  children,
  pendingLabel,
  pendingSlotClassName,
  ...props
}: NavLinkProps) {
  const t = useTranslations('Nav')

  if (!isInAppHref(props.href)) {
    const { href, ...anchorProps } = props
    return (
      <a href={String(href)} {...anchorProps}>
        {children as ReactNode}
      </a>
    )
  }

  return (
    <Link {...props}>
      {children as ReactNode}
      <LinkPending
        label={pendingLabel ?? t('pending')}
        slotClassName={pendingSlotClassName ?? SLOT_CLASS_NAME}
      />
    </Link>
  )
}
