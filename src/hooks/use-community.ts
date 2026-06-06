"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export interface CommunityFilters {
  search?: string
  level?: string
  sort?: "popular" | "recent"
  page?: number
}

export interface CommunityLessonSummary {
  id: string
  title: string
  description: string | null
  level: string | null
  tags: string[]
  cardCount: number
  addCount: number
  author: string
  publishedAt: string
}

export interface CommunityLessonsResponse {
  lessons: CommunityLessonSummary[]
  total: number
  page: number
  totalPages: number
}

export interface CommunityLessonCard {
  hanzi: string
  pinyin: string
  english: string
  type: string
  notes: string | null
}

export interface CommunityLessonDetail extends Omit<CommunityLessonSummary, never> {
  cards: CommunityLessonCard[]
}

export function useCommunityLessons(filters: CommunityFilters = {}) {
  return useQuery<CommunityLessonsResponse>({
    queryKey: ["community-lessons", filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.search) params.set("search", filters.search)
      if (filters.level) params.set("level", filters.level)
      if (filters.sort) params.set("sort", filters.sort)
      if (filters.page) params.set("page", filters.page.toString())

      const res = await fetch(`/api/community/lessons?${params}`)
      if (!res.ok) throw new Error("Failed to fetch community lessons")
      return res.json()
    }
  })
}

export function useCommunityLessonDetail(id: string) {
  return useQuery<CommunityLessonDetail>({
    queryKey: ["community-lesson", id],
    queryFn: async () => {
      const res = await fetch(`/api/community/lessons/${id}`)
      if (!res.ok) throw new Error("Failed to fetch lesson")
      return res.json()
    },
    enabled: !!id
  })
}

export function usePublishLesson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ lessonId, ...data }: { lessonId: string; title: string; description?: string; level?: string; tags?: string[] }) => {
      const res = await fetch(`/api/lessons/${lessonId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || "Failed to publish")
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] })
      queryClient.invalidateQueries({ queryKey: ["lesson", variables.lessonId] })
      queryClient.invalidateQueries({ queryKey: ["community-lessons"] })
    }
  })
}

export function useUnpublishLesson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (lessonId: string) => {
      const res = await fetch(`/api/lessons/${lessonId}/publish`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to unpublish")
      return res.json()
    },
    onSuccess: (_data, lessonId) => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] })
      queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] })
      queryClient.invalidateQueries({ queryKey: ["community-lessons"] })
    }
  })
}

export function useAddCommunityLesson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (publishedLessonId: string) => {
      const res = await fetch(`/api/community/lessons/${publishedLessonId}/add`, {
        method: "POST"
      })
      if (!res.ok) throw new Error("Failed to add lesson")
      return res.json() as Promise<{ lessonId: string; created: number; duplicates: number }>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards"] })
      queryClient.invalidateQueries({ queryKey: ["lessons"] })
      queryClient.invalidateQueries({ queryKey: ["community-lessons"] })
    }
  })
}
