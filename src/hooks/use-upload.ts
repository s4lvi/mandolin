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

  // Handle streaming NDJSON response
  const reader = res.body?.getReader()
  if (!reader) {
    throw new Error("No response body")
  }

  const decoder = new TextDecoder()
  let result: ParseNotesResponse | null = null
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // Process complete lines
    const lines = buffer.split("\n")
    buffer = lines.pop() || "" // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.trim()) continue

      try {
        const data = JSON.parse(line)

        // Check for errors
        if (data.error) {
          throw new Error(data.error)
        }

        // Check for final result (has cards array)
        if (data.cards) {
          result = data
        }
        // Otherwise it's a status update, ignore
      } catch (e) {
        if (e instanceof SyntaxError) {
          // Ignore JSON parse errors for status updates
          continue
        }
        throw e
      }
    }
  }

  // Process any remaining buffer
  if (buffer.trim()) {
    try {
      const data = JSON.parse(buffer)
      if (data.error) {
        throw new Error(data.error)
      }
      if (data.cards) {
        result = data
      }
    } catch {
      // Ignore parse errors
    }
  }

  if (!result) {
    throw new Error("No valid response received")
  }

  return result
}

export function useParseNotes() {
  return useMutation({
    mutationFn: parseNotes
  })
}
