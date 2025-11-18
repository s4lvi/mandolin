"use client"

import { useMutation } from "@tanstack/react-query"
import type { ParsedCard } from "@/types"

interface ParseNotesInput {
  notes: string
  lessonNumber?: number
  lessonTitle?: string
}

interface ParseNotesResponse {
  cards: (ParsedCard & { isDuplicate: boolean })[]
  lessonNumber?: number
  lessonTitle?: string
  totalParsed: number
  duplicatesFound: number
}

async function parseNotes(input: ParseNotesInput): Promise<ParseNotesResponse> {
  const res = await fetch("/api/parse-notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to parse notes")
  }

  return res.json()
}

export function useParseNotes() {
  return useMutation({
    mutationFn: parseNotes
  })
}
