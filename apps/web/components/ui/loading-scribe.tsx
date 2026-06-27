import { cn } from '@/lib/utils'

type LoadingScribeProps = {
  title?: string
  caption?: string
  className?: string
}

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
