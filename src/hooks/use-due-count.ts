"use client"

import { useQuery } from "@tanstack/react-query"

export function useDueCount() {
  return useQuery({
    queryKey: ["due-count"],
    queryFn: async () => {
      const res = await fetch("/api/review/due-count")
      if (!res.ok) return null
      const data = await res.json()
      return data.dueCount as number
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000
  })
}
