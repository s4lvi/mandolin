"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export interface CourseSummary {
  id: string
  slug: string
  title: string
  description: string | null
  level: number
  imageUrl: string | null
  isBuiltIn: boolean
  isPublished: boolean
  isMine: boolean
  totalLessons: number
  completedLessons: number
  enrollment: {
    currentLessonOrder: number
    completedAt: string | null
    enrolledAt: string
  } | null
}

export interface CourseLessonView {
  id: string
  order: number
  title: string
  description: string | null
  cardCount: number
  status: "LOCKED" | "UNLOCKED" | "IN_PROGRESS" | "COMPLETED"
  lessonId: string | null
}

export interface CourseDetail {
  course: {
    id: string
    slug: string
    title: string
    description: string | null
    level: number
    imageUrl: string | null
    isBuiltIn: boolean
    isPublished: boolean
    isMine: boolean
    totalLessons: number
  }
  enrollment: {
    currentLessonOrder: number
    completedAt: string | null
    enrolledAt: string
  } | null
  lessons: CourseLessonView[]
}

export function useCourses() {
  return useQuery<CourseSummary[]>({
    queryKey: ["courses"],
    queryFn: async () => {
      const res = await fetch("/api/courses")
      if (!res.ok) throw new Error("Failed to fetch courses")
      const data = await res.json()
      return data.courses
    }
  })
}

export function useCourseDetail(slug: string) {
  return useQuery<CourseDetail>({
    queryKey: ["course", slug],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${slug}`)
      if (!res.ok) throw new Error("Failed to fetch course")
      return res.json()
    },
    enabled: !!slug
  })
}

export function useEnrollCourse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (slug: string) => {
      const res = await fetch(`/api/courses/${slug}/enroll`, { method: "POST" })
      if (!res.ok) throw new Error("Failed to enroll")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] })
      queryClient.invalidateQueries({ queryKey: ["course"] })
    }
  })
}

export function useStartCourseLesson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ slug, order }: { slug: string; order: number }) => {
      const res = await fetch(`/api/courses/${slug}/lessons/${order}/start`, {
        method: "POST"
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to start lesson")
      }
      return res.json() as Promise<{ lessonId: string; created: number; duplicates: number }>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course"] })
      queryClient.invalidateQueries({ queryKey: ["cards"] })
    }
  })
}

export function useSetCoursePublished() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ slug, publish }: { slug: string; publish: boolean }) => {
      const res = await fetch(`/api/courses/${slug}/publish`, {
        method: publish ? "POST" : "DELETE"
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to update course")
      }
      return res.json() as Promise<{ isPublished: boolean }>
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["courses"] })
      queryClient.invalidateQueries({ queryKey: ["course", variables.slug] })
    }
  })
}

export function useCompleteCourseLesson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ slug, order }: { slug: string; order: number }) => {
      const res = await fetch(`/api/courses/${slug}/lessons/${order}/complete`, {
        method: "POST"
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to complete lesson")
      }
      return res.json() as Promise<{
        completed: boolean
        nextLessonOrder: number | null
        courseCompleted: boolean
      }>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] })
      queryClient.invalidateQueries({ queryKey: ["course"] })
    }
  })
}
