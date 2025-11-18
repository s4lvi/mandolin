"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Card, ExampleSentence } from "@/types"

interface FetchReviewCardsParams {
  limit?: number
  lessonId?: string
  type?: string
}

async function fetchReviewCards(
  params?: FetchReviewCardsParams
): Promise<Card[]> {
  const searchParams = new URLSearchParams()
  if (params?.limit) searchParams.set("limit", params.limit.toString())
  if (params?.lessonId) searchParams.set("lessonId", params.lessonId)
  if (params?.type) searchParams.set("type", params.type)

  const url = `/api/review${searchParams.toString() ? `?${searchParams}` : ""}`
  const res = await fetch(url)

  if (!res.ok) {
    throw new Error("Failed to fetch review cards")
  }

  const data = await res.json()
  return data.cards
}

async function submitReviewResult(
  cardId: string,
  correct: boolean
): Promise<Card> {
  const res = await fetch("/api/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cardId, correct })
  })

  if (!res.ok) {
    throw new Error("Failed to submit review")
  }

  const data = await res.json()
  return data.card
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
    staleTime: 0 // Always fetch fresh for review
  })
}

export function useSubmitReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ cardId, correct }: { cardId: string; correct: boolean }) =>
      submitReviewResult(cardId, correct),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards"] })
    }
  })
}

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
