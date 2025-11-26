"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Card, ExampleSentence } from "@/types"
import type {
  FetchReviewCardsParams,
  ReviewResponse,
  SubmitReviewRequest,
  ReviewResult,
  GenerateSentenceRequest,
  GenerateSentenceResponse,
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

async function submitReviewResult(
  cardId: string,
  quality: number
): Promise<ReviewResult> {
  const res = await fetch("/api/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cardId, quality })
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

export function useSubmitReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ cardId, quality }: { cardId: string; quality: number }) =>
      submitReviewResult(cardId, quality),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards"] })
      queryClient.invalidateQueries({ queryKey: ["user-stats"] })
      queryClient.invalidateQueries({ queryKey: ["review-cards"] })
    }
  })
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
