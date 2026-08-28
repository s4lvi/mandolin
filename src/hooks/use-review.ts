"use client"

import { useEffect, useRef, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { ExampleSentence } from "@/types"
import type {
  FetchReviewCardsParams,
  ReviewResponse,
  SubmitReviewRequest,
  ReviewResult,
  ReviewSource,
  UndoReviewResponse,
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
  if (params?.newLimit !== undefined) {
    searchParams.set("newLimit", params.newLimit.toString())
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
  quality: number,
  source: ReviewSource = "REVIEW"
): Promise<ReviewResult> {
  const body: SubmitReviewRequest = {
    cardId,
    quality,
    timezone: getClientTimeZone(),
    source
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

async function undoReview(historyId: string): Promise<UndoReviewResponse> {
  const res = await fetch("/api/review/undo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ historyId })
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || "Failed to undo review")
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
  // Submissions still in flight; a completion request while any are pending is
  // deferred until the last one settles so the refetched due count is accurate.
  const inFlight = useRef(0)
  const completeRequested = useRef(false)

  const invalidateSessionQueries = useCallback(() => {
    if (inFlight.current > 0) {
      completeRequested.current = true
      return
    }
    completeRequested.current = false
    if (!hasPendingInvalidation.current) return
    hasPendingInvalidation.current = false
    for (const queryKey of SESSION_QUERY_KEYS) {
      queryClient.invalidateQueries({ queryKey })
    }
  }, [queryClient])

  const trackStart = useCallback(() => {
    inFlight.current++
  }, [])
  const trackSettled = useCallback(() => {
    inFlight.current = Math.max(0, inFlight.current - 1)
    if (completeRequested.current) invalidateSessionQueries()
  }, [invalidateSessionQueries])

  // Flush on unmount (user leaves the review page after rating cards)
  useEffect(() => {
    return () => {
      invalidateSessionQueries()
    }
  }, [invalidateSessionQueries])

  const mutation = useMutation({
    mutationFn: ({
      cardId,
      quality,
      source
    }: {
      cardId: string
      quality: number
      source?: ReviewSource
    }) => submitReviewResult(cardId, quality, source),
    onMutate: trackStart,
    onSuccess: () => {
      hasPendingInvalidation.current = true
    },
    onSettled: trackSettled
  })

  const undoMutation = useMutation({
    mutationFn: ({ historyId }: { historyId: string }) => undoReview(historyId),
    onMutate: trackStart,
    onSuccess: () => {
      hasPendingInvalidation.current = true
    },
    onSettled: trackSettled
  })

  return {
    ...mutation,
    /** Revert the most recent review on the server (restores SRS fields + stats) */
    undo: undoMutation,
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
