'use client'

import { useEffect, useRef, type ReactNode } from 'react'

type ViewEnterProps = {
  children: ReactNode
  className?: string
  delay?: number
}

/**
 * IntersectionObserver-driven reveal wrapper — adds `in-view` class when the element enters the viewport.
 *
 * @param {object} root0 - The view enter props.
 * @param {React.ReactNode} root0.children - The content to reveal on scroll.
 * @param {string} [root0.className=''] - Optional additional CSS classes.
 * @param {number} [root0.delay=0] - Optional delay in milliseconds before adding the in-view class.
 * @returns {React.ReactElement} The reveal wrapper element.
 */
export function ViewEnter({
  children,
  className = '',
  delay = 0,
}: ViewEnterProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let timeout: ReturnType<typeof setTimeout> | undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay) {
            timeout = setTimeout(() => el.classList.add('in-view'), delay)
          } else {
            el.classList.add('in-view')
          }
          observer.unobserve(el)
        }
      },
      { threshold: 0.12 }
    )

    observer.observe(el)
    return () => {
      if (timeout) clearTimeout(timeout)
      observer.disconnect()
    }
  }, [delay])

  return (
    <div ref={ref} className={`ll-rise ${className}`}>
      {children}
    </div>
  )
}
