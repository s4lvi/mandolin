import prisma from "@/lib/prisma"
import { getAuthenticatedUserDeck } from "@/lib/api-helpers"
import { handleRouteError } from "@/lib/error-handler"
import { createLogger } from "@/lib/logger"
import { z } from "zod"
import Anthropic from "@anthropic-ai/sdk"
import { CLAUDE_MODEL_SMART } from "@/lib/constants"
import {
  PARSE_NOTES_SYSTEM,
  LESSON_CONTEXT_SYSTEM,
  parsedCardSchema,
  createLineBuffer,
  parseNdjsonLine,
  type ParsedCardLine
} from "@/lib/prompts/streaming"
import { rateLimited, RATE_LIMITS } from "@/lib/rate-limit"

const logger = createLogger("api/parse-notes")
const anthropic = new Anthropic({ timeout: 120_000, maxRetries: 2 })

// Keepalive interval for the NDJSON response (keeps proxies from idling out)
const HEARTBEAT_MS = 10_000

const parseNotesSchema = z.object({
  notes: z.string().min(1, "Notes are required"),
  lessonNumber: z.number().int().positive().optional(),
  lessonTitle: z.string().optional(),
  lessonMode: z.enum(["new", "existing", "none"]).optional(),
  selectedLessonId: z.string().optional()
})

type StreamedCard = ParsedCardLine & { isDuplicate: boolean }

/**
 * NDJSON event contract (one JSON object per line):
 *   {"status": "processing" | "parsing_cards" | "streaming"}   progress heartbeats
 *   {"type": "card", "card": {...ParsedCard, isDuplicate}}      each card as it is parsed
 *   {"type": "warning", "message": string}                      non-fatal (e.g. truncation)
 *   {"type": "done", cards, lessonContext?, lessonNumber?, lessonTitle?, lessonMode?,
 *                    selectedLessonId?, totalParsed, duplicatesFound}
 *   {"error": string}                                           fatal; stream ends
 */
export async function POST(req: Request) {
  try {
    const { error, deck } = await getAuthenticatedUserDeck()
    if (error) return error

    const limited = rateLimited(`ai:heavy:${deck.userId}`, RATE_LIMITS.AI_HEAVY)
    if (limited) return limited

    const body = await req.json()
    const data = parseNotesSchema.parse(body)

    // Existing cards so each streamed card can be flagged as a duplicate immediately
    const existingCards = await prisma.card.findMany({
      where: { deckId: deck.id },
      select: { hanzi: true }
    })
    const existingHanzi = new Set(existingCards.map((c: { hanzi: string }) => c.hanzi))

    const encoder = new TextEncoder()
    const needsContext = !!data.lessonMode && data.lessonMode !== "none"
    const notesMessage = `Lesson Notes:\n${data.notes}`

    const stream = new ReadableStream({
      async start(controller) {
        let closed = false
        const send = (payload: unknown) => {
          if (closed) return
          controller.enqueue(encoder.encode(JSON.stringify(payload) + "\n"))
        }
        const close = () => {
          if (closed) return
          closed = true
          controller.close()
        }

        const heartbeat = setInterval(() => send({ status: "streaming" }), HEARTBEAT_MS)

        try {
          send({ status: "processing" })
          send({ status: "parsing_cards" })

          // Context summary and card extraction run in parallel; the context
          // is short (effort low) and the cards stream out line by line.
          const contextPromise = needsContext
            ? (async () => {
                const contextStream = anthropic.messages.stream({
                  model: CLAUDE_MODEL_SMART,
                  max_tokens: 4096,
                  thinking: { type: "adaptive" },
                  output_config: { effort: "low" },
                  system: [
                    { type: "text", text: LESSON_CONTEXT_SYSTEM, cache_control: { type: "ephemeral" } }
                  ],
                  messages: [{ role: "user", content: notesMessage }]
                })

                let contextText = ""
                for await (const event of contextStream) {
                  if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                    contextText += event.delta.text
                  }
                }

                const contextMessage = await contextStream.finalMessage()
                if (contextMessage.stop_reason === "max_tokens") {
                  logger.warn("Lesson context was truncated", { deckId: deck.id })
                }
                return contextText.trim()
              })()
            : Promise.resolve("")

          const cardsPromise = (async () => {
            const cardsStream = anthropic.messages.stream({
              model: CLAUDE_MODEL_SMART,
              max_tokens: 16384,
              thinking: { type: "adaptive" },
              output_config: { effort: "medium" },
              system: [
                { type: "text", text: PARSE_NOTES_SYSTEM, cache_control: { type: "ephemeral" } }
              ],
              messages: [{ role: "user", content: notesMessage }]
            })

            const cards: StreamedCard[] = []
            const seen = new Set<string>()
            let invalidLines = 0
            const lines = createLineBuffer()

            const handleLine = (line: string) => {
              const raw = parseNdjsonLine(line)
              if (raw === null) return
              const parsed = parsedCardSchema.safeParse(raw)
              if (!parsed.success) {
                invalidLines++
                logger.warn("Skipping invalid card line", { deckId: deck.id, issues: parsed.error.issues })
                return
              }
              // The model occasionally repeats an entry; keep the first
              if (seen.has(parsed.data.hanzi)) return
              seen.add(parsed.data.hanzi)
              const card: StreamedCard = {
                ...parsed.data,
                isDuplicate: existingHanzi.has(parsed.data.hanzi)
              }
              cards.push(card)
              send({ type: "card", card })
            }

            let firstDelta = true
            for await (const event of cardsStream) {
              if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                if (firstDelta) {
                  firstDelta = false
                  send({ status: "streaming" })
                }
                for (const line of lines.push(event.delta.text)) handleLine(line)
              }
            }
            for (const line of lines.flush()) handleLine(line)

            const finalMessage = await cardsStream.finalMessage()
            return { cards, invalidLines, finalMessage }
          })()

          const [lessonContext, cardsResult] = await Promise.all([contextPromise, cardsPromise])
          if (needsContext) {
            logger.info("Lesson context generated", { deckId: deck.id, length: lessonContext.length })
          }

          const { cards, finalMessage } = cardsResult

          if (finalMessage.stop_reason === "max_tokens") {
            logger.warn("Card extraction was truncated", { deckId: deck.id, cards: cards.length })
            if (cards.length === 0) {
              send({ error: "Response was too long and got truncated. Try with shorter notes." })
              close()
              return
            }
            send({
              type: "warning",
              message: "The notes were too long to parse completely — only the first cards were extracted. Try splitting the notes."
            })
          }

          if (cards.length === 0) {
            send({ error: "No cards could be extracted from these notes. Please try again." })
            close()
            return
          }

          const duplicatesFound = cards.filter((c) => c.isDuplicate).length
          send({
            type: "done",
            cards,
            lessonContext: lessonContext || undefined,
            lessonNumber: data.lessonNumber,
            lessonTitle: data.lessonTitle,
            lessonMode: data.lessonMode,
            selectedLessonId: data.selectedLessonId,
            totalParsed: cards.length,
            duplicatesFound
          })

          logger.info("Notes parsed successfully", {
            deckId: deck.id,
            totalParsed: cards.length,
            duplicates: duplicatesFound,
            invalidLines: cardsResult.invalidLines,
            hasLessonContext: !!lessonContext,
            cacheRead: finalMessage.usage.cache_read_input_tokens ?? 0,
            cacheWrite: finalMessage.usage.cache_creation_input_tokens ?? 0
          })
          close()
        } catch (error) {
          logger.error("Streaming error during note parsing", { error, deckId: deck.id })
          send({ error: "Failed to parse notes. Please try again." })
          close()
        } finally {
          clearInterval(heartbeat)
        }
      }
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked"
      }
    })
  } catch (error) {
    logger.error("Failed to parse notes", { error })
    return handleRouteError(error)
  }
}
