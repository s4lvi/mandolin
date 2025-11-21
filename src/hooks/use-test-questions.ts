"use client"

import { useQuery, useMutation } from "@tanstack/react-query"

export interface TestQuestion {
  id: string
  questionText: string
  correctAnswer: string
  acceptableAnswers: string[]
  distractors: string[]
  timesUsed: number
}

interface TestQuestionResponse {
  cached: boolean
  question: TestQuestion
}

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
    staleTime: Infinity, // Questions are cached permanently
    gcTime: 1000 * 60 * 60 // 1 hour
  })
}

// Prefetch questions for entire session
export function usePrefetchTestQuestions() {
  return useMutation({
    mutationFn: async ({
      cardIds,
      direction
    }: {
      cardIds: string[]
      direction: string
    }) => {
      // Trigger fetches in parallel (will use cache if available)
      await Promise.all(
        cardIds.map(cardId => fetchTestQuestion(cardId, direction))
      )
    }
  })
}
