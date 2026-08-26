"use client"

import { useEffect, useRef, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { ExampleSentence } from "@/types"
import type {
  FetchReviewCardsParams,
  ReviewResponse,
  SubmitReviewRequest,
  ReviewResult,
  UserStats
} from "@/types/api-responses"

async function fetchReviewCards(
  params?: FetchReviewCardsParams
): Promise<ReviewResponse> {
  const searchParams = new URLSearchParams()
  if (params?.limit) searchParams.set("limit", params.limit.toString())
  if (params?.lessonId) searchParams.set("lessonId", params.lessonId)
  if (params?.types && params.types.length > 0) {
    searchParams.set("types", params.types.join(","))
  }
  if (params?.allCards) searchParams.set("allCards", "true")
  if (params?.tagIds && params.tagIds.length > 0) {
    searchParams.set("tagIds", params.tagIds.join(","))
  }

  const url = `/api/review${searchParams.toString() ? `?${searchParams}` : ""}`
  const res = await fetch(url)

  if (!res.ok) {
    throw new Error("Failed to fetch review cards")
  }

  return res.json()
}

function getClientTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  } catch {
    return "UTC"
  }
}

async function submitReviewResult(
  cardId: string,
  quality: number
): Promise<ReviewResult> {
  const body: SubmitReviewRequest = {
    cardId,
    quality,
    timezone: getClientTimeZone()
  }
  const res = await fetch("/api/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    throw new Error("Failed to submit review")
  }

  return res.json()
}

async function generateSentence(
  grammarPoint: string,
  context?: string
): Promise<ExampleSentence> {
  const res = await fetch("/api/generate-sentence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grammarPoint, context })
  })

  if (!res.ok) {
    throw new Error("Failed to generate sentence")
  }

  return res.json()
}

export function useReviewCards(params?: FetchReviewCardsParams) {
  return useQuery({
    queryKey: ["review-cards", params],
    queryFn: () => fetchReviewCards(params),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000    // Keep in cache for 10 minutes
  })
}

// Query keys that go stale as a review session progresses. They are refreshed
// once per session (on completion or unmount) instead of after every rating,
// so an active session never triggers a full refetch of its own card list.
const SESSION_QUERY_KEYS = [["review-cards"], ["due-count"], ["user-stats"], ["cards"]] as const

export function useSubmitReview() {
  const queryClient = useQueryClient()
  const hasPendingInvalidation = useRef(false)

  const invalidateSessionQueries = useCallback(() => {
    if (!hasPendingInvalidation.current) return
    hasPendingInvalidation.current = false
    for (const queryKey of SESSION_QUERY_KEYS) {
      queryClient.invalidateQueries({ queryKey })
    }
  }, [queryClient])

  // Flush on unmount (user leaves the review page after rating cards)
  useEffect(() => {
    return () => {
      invalidateSessionQueries()
    }
  }, [invalidateSessionQueries])

  const mutation = useMutation({
    mutationFn: ({ cardId, quality }: { cardId: string; quality: number }) =>
      submitReviewResult(cardId, quality),
    onSuccess: () => {
      hasPendingInvalidation.current = true
    }
  })

  return {
    ...mutation,
    /** Call when a session finishes to refresh cards, due count, and stats once */
    completeSession: invalidateSessionQueries
  }
}

export type { UserStats, ReviewResult, ReviewResponse }

export function useGenerateSentence() {
  return useMutation({
    mutationFn: ({
      grammarPoint,
      context
    }: {
      grammarPoint: string
      context?: string
    }) => generateSentence(grammarPoint, context)
  })
}
