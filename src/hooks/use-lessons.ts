"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Lesson } from "@prisma/client"

// Extended Lesson type with card count and interactive lesson progress
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

// Delete a lesson
async function deleteLesson(lessonId: string): Promise<void> {
  const res = await fetch(`/api/lessons/${lessonId}`, {
    method: "DELETE"
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to delete lesson")
  }
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] })
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
