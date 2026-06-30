import { cn } from '@/lib/utils'

type LoadingScribeProps = {
  title?: string
  caption?: string
  className?: string
}

/**
 * Animated loading indicator — quill icon with configurable title and caption.
 *
 * @param {object} root0 - The loading scribe props.
 * @param {string} [root0.title='The Scribe is writing'] - The heading text.
 * @param {string} [root0.caption='Gathering the campaign thread'] - The caption text below the heading.
 * @param {string} [root0.className] - Optional additional CSS classes to merge.
 * @returns {React.ReactElement} The loading indicator element.
 */
export function LoadingScribe({
  title = 'The Scribe is writing',
  caption = 'Gathering the campaign thread',
  className,
}: LoadingScribeProps) {
  return (
    <div className={cn('py-12 text-center', className)} role="status">
      <span aria-hidden="true" className="ll-quill inline-block text-3xl">
        ✒
      </span>
      <h2 className="mt-3 font-serif text-xl font-semibold text-[var(--ink)]">
        {title}
      </h2>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--ink-3)]">
        {caption}
        <span className="ll-ellip" />
      </p>
    </div>
  )
}
