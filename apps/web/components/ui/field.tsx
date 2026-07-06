'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

type FieldProps = {
  label: string
  optional?: boolean
  help?: string
  error?: string
  children: React.ReactElement
  className?: string
}

/**
 * Form field wrapper with label, help text, and error display.
 * Wires aria-describedby to the child control for accessibility.
 *
 * @param {object} root0 - The field props.
 * @param {string} root0.label - The label text for the field.
 * @param {boolean} [root0.optional] - Whether to show the optional marker.
 * @param {string} [root0.help] - Help text shown when no error is present.
 * @param {string} [root0.error] - Error text shown when present (supersedes help).
 * @param {React.ReactElement} root0.children - The form control to wrap.
 * @param {string} [root0.className] - Optional additional CSS classes.
 * @returns {React.ReactElement} The field wrapper element.
 */
export function Field({
  label,
  optional,
  help,
  error,
  children,
  className,
}: FieldProps) {
  const descriptionId = React.useId()
  const generatedControlId = React.useId()
  const hasError = Boolean(error)
  const hasHelp = Boolean(help) && !hasError
  const showDescription = hasError || hasHelp

  // Associate the label with the control (htmlFor/id) for accessibility so the
  // label is programmatically tied to its input; reuse any id the child already
  // carries. aria-describedby links help/error text when present.
  const controlId = (children.props as { id?: string }).id ?? generatedControlId
  const childWithAria = React.cloneElement(children, {
    id: controlId,
    ...(showDescription ? { 'aria-describedby': descriptionId } : {}),
  } as Record<string, unknown>)

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={controlId}
        className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink)]"
      >
        {label}
        {optional && (
          <span className="ml-1 text-[var(--ink-3)]">· optional</span>
        )}
      </label>
      {childWithAria}
      {hasHelp && (
        <span id={descriptionId} className="text-xs text-[var(--ink-2)]">
          {help}
        </span>
      )}
      {hasError && (
        <span
          id={descriptionId}
          role="alert"
          className="text-xs text-[var(--danger)]"
        >
          {error}
        </span>
      )}
    </div>
  )
}
