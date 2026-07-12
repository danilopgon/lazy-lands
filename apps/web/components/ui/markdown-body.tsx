'use client'

import type { ComponentPropsWithoutRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { cn } from '@/lib/utils'

type MarkdownBodyProps = {
  children: string
  className?: string
}

/**
 * Render Scribe-generated section text as Markdown.
 *
 * Section bodies arrive from the LLM as Markdown (bold, italics, bullet and
 * numbered lists). Soft line breaks are preserved with `whitespace-pre-line`
 * on paragraphs, so intentional line breaks (e.g. bullet-style beats) survive
 * without a hard-break plugin. Rendering goes through react-markdown, which is
 * escaped by default — no raw HTML is injected.
 *
 * @param {object} root0 - The markdown body props.
 * @param {string} root0.children - Raw Markdown text to render.
 * @param {string} [root0.className] - Optional classes for the wrapper.
 * @returns {React.ReactElement} The rendered Markdown element.
 */
export function MarkdownBody({ children, className }: MarkdownBodyProps) {
  return (
    <div className={cn('font-serif text-[15px] text-[var(--ink)]', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }: ComponentPropsWithoutRef<'p'>) => (
            <p className="whitespace-pre-line leading-relaxed [&:not(:first-child)]:mt-3">
              {children}
            </p>
          ),
          strong: ({ children }: ComponentPropsWithoutRef<'strong'>) => (
            <strong className="font-semibold">{children}</strong>
          ),
          em: ({ children }: ComponentPropsWithoutRef<'em'>) => (
            <em className="italic">{children}</em>
          ),
          ul: ({ children }: ComponentPropsWithoutRef<'ul'>) => (
            <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed">
              {children}
            </ul>
          ),
          ol: ({ children }: ComponentPropsWithoutRef<'ol'>) => (
            <ol className="mt-2 list-decimal space-y-1 pl-5 leading-relaxed">
              {children}
            </ol>
          ),
          a: ({ children, href }: ComponentPropsWithoutRef<'a'>) => (
            <a
              href={href}
              className="underline"
              target="_blank"
              rel="noreferrer"
            >
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
