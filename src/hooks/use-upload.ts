"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import type { ParseNotesRequest, ParseNotesResponse } from "@/types/api-responses"

export type ParseStatus = "idle" | "processing" | "generating_context" | "parsing_cards" | "streaming"

async function parseNotesStreaming(
  input: ParseNotesRequest,
  onStatus: (status: ParseStatus) => void
): Promise<ParseNotesResponse> {
  const res = await fetch("/api/parse-notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to parse notes")
  }

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

    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      if (!line.trim()) continue

      try {
        const data = JSON.parse(line)

        if (data.error) {
          throw new Error(data.error)
        }

        // Surface status updates
        if (data.status) {
          onStatus(data.status as ParseStatus)
        }

        if (data.cards) {
          result = data
        }
      } catch (e) {
        if (e instanceof SyntaxError) {
          continue
        }
        throw e
      }
    }
  }

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

  onStatus("idle")
  return result
}

export function useParseNotes() {
  const [parseStatus, setParseStatus] = useState<ParseStatus>("idle")

  const mutation = useMutation({
    mutationFn: (input: ParseNotesRequest) =>
      parseNotesStreaming(input, setParseStatus),
    onError: () => setParseStatus("idle")
  })

  return { ...mutation, parseStatus }
}
