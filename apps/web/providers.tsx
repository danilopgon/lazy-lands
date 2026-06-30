'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

/**
 * Root client provider — wraps the component tree with TanStack Query's
 * QueryClientProvider. A single QueryClient is created per browser tab
 * via useState's lazy initializer to avoid re-creating on re-renders.
 *
 * @param {object} props - Component props.
 * @param {React.ReactNode} props.children - The application component tree.
 * @returns {React.ReactElement} The tree wrapped in QueryClientProvider.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
