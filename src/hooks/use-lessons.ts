"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Lesson } from "@prisma/client"

// Extended Lesson type with card count and interactive lesson progress.
// `sourceType` and `pagesStale` come straight from the Lesson model.
export interface LessonWithCount extends Lesson {
  _count?: {
    cards: number
    pages: number
  }
  lessonProgress?: {
    currentPage: number
    totalPages: number
    completedAt: string | null
    isComplete: boolean
  } | null
}

// Fetch all lessons for current user
async function fetchLessons(): Promise<LessonWithCount[]> {
  const res = await fetch("/api/lessons")
  if (!res.ok) {
    throw new Error("Failed to fetch lessons")
  }
  const data = await res.json()
  return data.lessons || []
}

// Create a new lesson
async function createLesson(data: {
  number: number
  title?: string
  notes?: string
  date?: string
}): Promise<Lesson> {
  const res = await fetch("/api/lessons", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to create lesson")
  }

  const json = await res.json()
  return json.lesson
}

// Associate multiple cards with a lesson
async function associateCardsWithLesson(data: {
  cardIds: string[]
  lessonId: string
}): Promise<{ success: boolean; updatedCount: number; lessonTitle: string }> {
  const res = await fetch("/api/cards/associate-lesson", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to associate cards")
  }

  return res.json()
}

// Update a lesson
async function updateLesson(
  lessonId: string,
  data: {
    number?: number
    title?: string
    notes?: string
    date?: string
  }
): Promise<Lesson> {
  const res = await fetch(`/api/lessons/${lessonId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to update lesson")
  }

  return res.json()
}

// Delete a lesson (optionally deleting its cards too)
async function deleteLesson({
  lessonId,
  deleteCards = false
}: {
  lessonId: string
  deleteCards?: boolean
}): Promise<{ deletedCards: number }> {
  const res = await fetch(
    `/api/lessons/${lessonId}${deleteCards ? "?deleteCards=true" : ""}`,
    { method: "DELETE" }
  )

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to delete lesson")
  }
  return res.json()
}

// Hook: Get all lessons
export function useLessons() {
  return useQuery({
    queryKey: ["lessons"],
    queryFn: fetchLessons,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  })
}

// Hook: Create lesson
export function useCreateLesson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createLesson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] })
    }
  })
}

// Hook: Associate cards with lesson
export function useAssociateCardsWithLesson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: associateCardsWithLesson,
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["lessons"] })
      queryClient.invalidateQueries({ queryKey: ["cards"] })
    }
  })
}

// Hook: Update lesson
export function useUpdateLesson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ lessonId, data }: { lessonId: string; data: Parameters<typeof updateLesson>[1] }) =>
      updateLesson(lessonId, data),
    onSuccess: (_data, { lessonId }) => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] })
      queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] })
    }
  })
}

// Hook: Delete lesson
export function useDeleteLesson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteLesson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] })
      queryClient.invalidateQueries({ queryKey: ["cards"] })
    }
  })
}

// Hook: Replace a card's full set of lesson memberships
export function useSetCardLessons() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ cardId, lessonIds }: { cardId: string; lessonIds: string[] }) => {
      const res = await fetch(`/api/cards/${cardId}/lessons`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonIds })
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || "Failed to update lessons")
      }
      return res.json() as Promise<{ added: number; removed: number }>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] })
      queryClient.invalidateQueries({ queryKey: ["lesson"] })
      queryClient.invalidateQueries({ queryKey: ["cards"] })
    }
  })
}

// Hook: Remove cards from a lesson (unlink only)
export function useRemoveCardsFromLesson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ lessonId, cardIds }: { lessonId: string; cardIds: string[] }) => {
      const res = await fetch(`/api/lessons/${lessonId}/cards`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardIds })
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || "Failed to remove cards")
      }
      return res.json() as Promise<{ removed: number }>
    },
    onSuccess: (_data, { lessonId }) => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] })
      queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] })
      queryClient.invalidateQueries({ queryKey: ["cards"] })
    }
  })
}

// Hook: Regenerate a lesson's interactive pages (also resets the user's progress
// for that lesson server-side, since the old page/segment ids no longer exist)
export function useRegenerateLessonPages() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (lessonId: string) => {
      const res = await fetch(`/api/lessons/${lessonId}/generate-pages?regenerate=true`, {
        method: "POST"
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || "Failed to regenerate lesson")
      }
      return res.json() as Promise<{ lessonId: string; totalPages: number; stale: boolean }>
    },
    onSuccess: (_data, lessonId) => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] })
      queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] })
    }
  })
}
