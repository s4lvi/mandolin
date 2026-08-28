"use client"

import { useQuery, useMutation } from "@tanstack/react-query"
import type {
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

/**
 * Kick off server-side background generation of cached test questions for a
 * session's cards. Call once at test-session start with the session's card ids;
 * the server generates only the missing ones (4 at a time) and returns
 * immediately, so `useTestQuestion` hits the cache as the user advances.
 */
export function usePrefetchTestQuestions() {
  return useMutation({
    mutationFn: async ({ cardIds, direction }: PrefetchTestQuestionsRequest) => {
      if (cardIds.length === 0) return
      const res = await fetch("/api/test-questions/prefetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardIds: cardIds.slice(0, 100), direction })
      })
      if (!res.ok) {
        throw new Error("Failed to prefetch test questions")
      }
    }
  })
}
