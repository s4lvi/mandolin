"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { initCapacitor } from "@/lib/capacitor"

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Initialize Capacitor native plugins on mount (no-ops on web)
  useEffect(() => {
    initCapacitor()
  }, [])

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000
          }
        }
      })
  )

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
