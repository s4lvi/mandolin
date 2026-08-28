"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import type { ParseNotesRequest, ParseNotesResponse } from "@/types/api-responses"

export type ParseStatus = "idle" | "processing" | "generating_context" | "parsing_cards" | "streaming"

export type StreamedParsedCard = ParseNotesResponse["cards"][number]

export interface ParseNotesResult extends ParseNotesResponse {
  /** Non-fatal problem reported by the server (e.g. notes were truncated) */
  warning?: string
}

interface StreamCallbacks {
  onStatus: (status: ParseStatus) => void
  onCard: (card: StreamedParsedCard) => void
}

/**
 * Consumes the parse-notes NDJSON stream. Events:
 *   {"status": ...}            progress heartbeat
 *   {"type":"card","card":..}  one parsed card, forwarded immediately
 *   {"type":"warning",...}     non-fatal notice, attached to the result
 *   {"type":"done", ...}       final ParseNotesResponse payload
 *   {"error": ...}             fatal
 */
async function parseNotesStreaming(
  input: ParseNotesRequest,
  { onStatus, onCard }: StreamCallbacks
): Promise<ParseNotesResult> {
  const res = await fetch("/api/parse-notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.error || "Failed to parse notes")
  }

  const reader = res.body?.getReader()
  if (!reader) {
    throw new Error("No response body")
  }

  const decoder = new TextDecoder()
  let result: ParseNotesResult | null = null
  let warning: string | undefined
  let buffer = ""

  const handleLine = (line: string) => {
    if (!line.trim()) return
    let data: Record<string, unknown>
    try {
      data = JSON.parse(line)
    } catch {
      return // partial/garbled line; ignore
    }

    if (typeof data.error === "string") {
      throw new Error(data.error)
    }
    if (typeof data.status === "string") {
      onStatus(data.status as ParseStatus)
      return
    }
    switch (data.type) {
      case "card":
        onCard(data.card as StreamedParsedCard)
        break
      case "warning":
        warning = String(data.message)
        break
      case "done":
        result = data as unknown as ParseNotesResult
        break
      default:
        // Legacy shape: the final payload without a type discriminator
        if (Array.isArray(data.cards)) result = data as unknown as ParseNotesResult
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
  handleLine(buffer)

  if (!result) {
    throw new Error("No valid response received")
  }

  onStatus("idle")
  return warning ? { ...(result as ParseNotesResult), warning } : result
}

export interface UseParseNotesOptions {
  /** Called for each card as soon as the server has parsed it */
  onCard?: (card: StreamedParsedCard) => void
}

export function useParseNotes({ onCard }: UseParseNotesOptions = {}) {
  const [parseStatus, setParseStatus] = useState<ParseStatus>("idle")
  const [streamedCount, setStreamedCount] = useState(0)

  const mutation = useMutation({
    mutationFn: (input: ParseNotesRequest) => {
      setStreamedCount(0)
      return parseNotesStreaming(input, {
        onStatus: setParseStatus,
        onCard: (card) => {
          setStreamedCount((n) => n + 1)
          onCard?.(card)
        }
      })
    },
    onError: () => setParseStatus("idle")
  })

  return { ...mutation, parseStatus, streamedCount }
}
