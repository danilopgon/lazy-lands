import * as React from 'react'

import { cn } from '@/lib/utils'

type SectionHeaderProps = React.HTMLAttributes<HTMLDivElement> & {
  title: string
  description?: string
  kicker?: string
  marker?: React.ReactNode
  titleAs?: 'h1' | 'h2' | 'h3'
}

/**
 * Section heading block — optional kicker, marker, configurable heading level, and description.
 *
 * @param {object} root0 - The section header props, extending standard HTML div attributes.
 * @param {string} root0.title - The main heading text.
 * @param {string} [root0.description] - Optional supporting description text below the heading.
 * @param {string} [root0.kicker] - Optional small uppercase label above the heading.
 * @param {React.ReactNode} [root0.marker] - Optional decorative marker element beside the heading.
 * @param {'h1'|'h2'|'h3'} [root0.titleAs='h2'] - The HTML heading level to render.
 * @param {string} [root0.className] - Optional additional CSS classes to merge.
 * @returns {React.ReactElement} The section header element.
 */
export function SectionHeader({
  title,
  description,
  kicker,
  marker,
  titleAs = 'h2',
  className,
  ...props
}: SectionHeaderProps) {
  const Title = titleAs

  return (
    <div className={cn('max-w-[720px]', className)} {...props}>
      {kicker ? (
        <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--accent-deep)]">
          {kicker}
        </p>
      ) : null}
      <div className="flex items-start gap-3">
        {marker ? (
          <span className="mt-2 font-mono text-sm font-bold text-[var(--accent)]">
            {marker}
          </span>
        ) : null}
        <div>
          <Title className="font-serif text-4xl font-semibold leading-none tracking-[-0.025em] text-[var(--ink)] llg:text-[52px]">
            {title}
          </Title>
          {description ? (
            <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-[var(--ink-2)]">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
