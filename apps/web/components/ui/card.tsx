import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Bordered paper card with offset shadow.
 *
 * @param {object} root0 - The card props, extending standard HTML div attributes.
 * @param {string} [root0.className] - Optional additional CSS classes to merge.
 * @returns {React.ReactElement} The card container element.
 */
export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'border-2 border-[var(--border)] bg-[var(--paper)] shadow-[6px_6px_0_var(--shadow)]',
        className
      )}
      {...props}
    />
  )
}

/**
 * Vertical padding container for card header content.
 *
 * @param {object} root0 - The card header props, extending standard HTML div attributes.
 * @param {string} root0.className - Optional additional CSS classes to merge.
 * @returns {React.ReactElement} The card header element.
 */
export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  )
}

/**
 * Serif heading inside a Card.
 *
 * @param {object} root0 - The card title props, extending standard HTML heading attributes.
 * @param {string} root0.className - Optional additional CSS classes to merge.
 * @returns {React.ReactElement} The card title heading element.
 */
export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'font-serif text-2xl font-semibold leading-none tracking-tight',
        className
      )}
      {...props}
    />
  )
}

/**
 * Muted secondary text below a CardTitle.
 *
 * @param {object} root0 - The card description props, extending standard HTML paragraph attributes.
 * @param {string} root0.className - Optional additional CSS classes to merge.
 * @returns {React.ReactElement} The card description paragraph element.
 */
export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-[var(--ink-2)]', className)} {...props} />
  )
}

/**
 * Body area of a Card — no top padding so it sits flush against the header.
 *
 * @param {object} root0 - The card content props, extending standard HTML div attributes.
 * @param {string} root0.className - Optional additional CSS classes to merge.
 * @returns {React.ReactElement} The card content element.
 */
export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6 pt-0', className)} {...props} />
}

/**
 * Bottom row of a Card — typically for actions or metadata.
 *
 * @param {object} root0 - The card footer props, extending standard HTML div attributes.
 * @param {string} root0.className - Optional additional CSS classes to merge.
 * @returns {React.ReactElement} The card footer element.
 */
export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center p-6 pt-0', className)} {...props} />
  )
}
