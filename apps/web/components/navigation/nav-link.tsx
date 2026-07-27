'use client'

import { useEffect, useState, type ComponentProps, type ReactNode } from 'react'
import { useLinkStatus } from 'next/link'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { NAV_PENDING_DELAY_MS } from '@/lib/motion/tokens'

type LocaleLinkProps = ComponentProps<typeof Link>

type NavLinkProps = LocaleLinkProps & {
  /** Overrides the default screen-reader announcement while navigating. */
  pendingLabel?: string
  /**
   * Repositions the status slot. The inline default reserves its width on a
   * text line; block-level links (cards, list rows) pass an absolute placement
   * instead, because an inline slot would grow their box when the quill
   * appears.
   */
  pendingSlotClassName?: string
}

/** Fixed inline slot so the link never reflows when the quill appears. */
const SLOT_CLASS_NAME = 'ml-1 inline-block w-[1em] text-center align-baseline'

/**
 * Decide whether a destination is handled by the client router.
 *
 * Hash fragments and absolute URLs never produce a router transition, so they
 * get a bare anchor instead of a status affordance.
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
 * `useLinkStatus` only returns a real value inside Next's `<Link>` subtree, so
 * this component must never be rendered anywhere else — outside it the hook
 * silently reports an idle navigation instead of failing.
 *
 * The delay keeps a warm, already-prefetched navigation from flashing an
 * indicator it would clear in the same frame.
 *
 * @param {object} root0 - Reader props.
 * @param {string} root0.label - Screen-reader announcement while navigating.
 * @param {string} root0.slotClassName - Placement classes for the status slot.
 * @returns {React.ReactElement} The reserved status slot.
 */
function LinkPending({
  label,
  slotClassName,
}: {
  label: string
  slotClassName: string
}) {
  const { pending } = useLinkStatus()
  const [hasGraceElapsed, setHasGraceElapsed] = useState(false)
  // Gating on `pending` as well keeps the affordance from surviving one frame
  // into the next navigation; the cleanup only rearms the grace period.
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

  if (!isVisible) {
    return (
      <span
        aria-hidden="true"
        data-testid="nav-link-pending"
        className={slotClassName}
      />
    )
  }

  return (
    <span
      role="status"
      data-testid="nav-link-pending"
      className={slotClassName}
    >
      {/* Deliberately CSS-only: the glyph and its label stay perceivable when
          `data-motion` disables the quill animation. */}
      <span aria-hidden="true" className="ll-quill inline-block">
        ✒
      </span>
      <span className="sr-only">{label}</span>
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
