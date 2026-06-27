'use client'

import { useEffect, useRef, type ReactNode } from 'react'

type ViewEnterProps = {
  children: ReactNode
  className?: string
  delay?: number
}

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
