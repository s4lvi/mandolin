"use client"

import { useCallback, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export interface StoryWordDetail {
  hanzi: string
  pinyin: string
  english: string
}

export interface StorySentence {
  hanzi: string
  pinyin: string
  english: string
  newWords?: string[]
  newWordDetails?: StoryWordDetail[]
}

export interface Story {
  id?: string
  title: string
  titlePinyin: string
  titleEnglish: string
  sentences: StorySentence[]
  createdAt?: string
}

/** Status events streamed by POST /api/stories/generate, in order. */
export type StoryGenerateStage = "selecting" | "generating" | "finalizing"

export const STORY_STAGE_ORDER: StoryGenerateStage[] = ["selecting", "generating", "finalizing"]

export const STORY_STAGE_LABELS: Record<StoryGenerateStage, string> = {
  selecting: "Choosing vocabulary",
  generating: "Writing story",
  finalizing: "Adding pinyin"
}

interface StoriesResponse {
  stories: Story[]
  /** A story was generated ahead of time; "New Story" will return it instantly. */
  hasPrefetched: boolean
}

async function fetchStories(): Promise<StoriesResponse> {
  const res = await fetch("/api/stories")
  if (!res.ok) throw new Error("Failed to fetch stories")
  const data = await res.json()
  return { stories: data.stories ?? [], hasPrefetched: Boolean(data.hasPrefetched) }
}

const STORIES_QUERY_KEY = ["stories"]

export function useStories() {
  return useQuery({
    queryKey: STORIES_QUERY_KEY,
    queryFn: fetchStories,
    select: (data) => data.stories
  })
}

/** True when the server has a prefetched story waiting for "New Story". */
export function useHasPrefetchedStory() {
  const { data } = useQuery({
    queryKey: STORIES_QUERY_KEY,
    queryFn: fetchStories,
    select: (data) => data.hasPrefetched
  })
  return data ?? false
}

export function useDeleteStory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (storyId: string) => {
      const res = await fetch(`/api/stories?id=${storyId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete story")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] })
    }
  })
}

/**
 * Generates a story via the NDJSON streaming endpoint, exposing the current
 * stage so the UI can show real progress rather than a generic spinner.
 */
export function useGenerateStory() {
  const queryClient = useQueryClient()
  const [stage, setStage] = useState<StoryGenerateStage>("selecting")
  const [isGenerating, setIsGenerating] = useState(false)

  const generate = useCallback(async (): Promise<Story> => {
    setIsGenerating(true)
    setStage("selecting")
    try {
      const res = await fetch("/api/stories/generate", { method: "POST" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to generate story")
      }
      const reader = res.body?.getReader()
      if (!reader) throw new Error("No response body")

      const decoder = new TextDecoder()
      let buffer = ""
      let story: Story | null = null

      const handleLine = (line: string) => {
        if (!line.trim()) return
        const data = JSON.parse(line)
        if (data.error) throw new Error(data.error)
        if (data.sentences) {
          story = data as Story
        } else if (typeof data.status === "string" && data.status in STORY_STAGE_LABELS) {
          setStage(data.status as StoryGenerateStage)
        }
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""
        for (const line of lines) handleLine(line)
      }
      if (buffer.trim()) handleLine(buffer)

      if (!story) throw new Error("No story received")
      queryClient.invalidateQueries({ queryKey: ["stories"] })
      return story
    } finally {
      setIsGenerating(false)
    }
  }, [queryClient])

  return { generate, isGenerating, stage }
}
