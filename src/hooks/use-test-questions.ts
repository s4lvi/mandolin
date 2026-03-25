"use client"

import { useQuery, useMutation } from "@tanstack/react-query"
import type {
  TestQuestion,
  TestQuestionResponse,
  PrefetchTestQuestionsRequest
} from "@/types/api-responses"

async function fetchTestQuestion(
  cardId: string,
  direction: string
): Promise<TestQuestionResponse> {
  const res = await fetch("/api/test-questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cardId, direction })
  })

  if (!res.ok) {
    throw new Error("Failed to fetch test question")
  }

  return res.json()
}

export function useTestQuestion(cardId: string, direction: string) {
  return useQuery({
    queryKey: ["test-question", cardId, direction],
    queryFn: () => fetchTestQuestion(cardId, direction),
    staleTime: 1000 * 60 * 60, // Questions are DB-cached server-side, keep client cache 1 hour
    gcTime: 1000 * 60 * 120 // 2 hours
  })
}

// Prefetch questions sequentially to avoid rate limits
export function usePrefetchTestQuestions() {
  return useMutation({
    mutationFn: async ({ cardIds, direction }: PrefetchTestQuestionsRequest) => {
      // Fetch one at a time to avoid concurrent Claude API calls
      for (const cardId of cardIds) {
        await fetchTestQuestion(cardId, direction)
      }
    }
  })
}
