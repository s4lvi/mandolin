import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getAuthenticatedUserDeck } from "@/lib/api-helpers"
import { handleRouteError } from "@/lib/error-handler"
import { createLogger } from "@/lib/logger"
import { z } from "zod"
import Anthropic from "@anthropic-ai/sdk"
import type { ParsedCard } from "@/types"
import { PARSE_NOTES_PROMPT, LESSON_CONTEXT_PROMPT } from "@/lib/constants"

const logger = createLogger("api/parse-notes")
const anthropic = new Anthropic()

const parseNotesSchema = z.object({
  notes: z.string().min(1, "Notes are required"),
  lessonNumber: z.number().int().positive().optional(),
  lessonTitle: z.string().optional(),
  lessonMode: z.enum(["new", "existing", "none"]).optional(),
  selectedLessonId: z.string().optional()
})

export async function POST(req: Request) {
  try {
    const { error, deck } = await getAuthenticatedUserDeck()
    if (error) return error

    const body = await req.json()
    const data = parseNotesSchema.parse(body)

    // Get existing cards to mark duplicates
    const existingCards = await prisma.card.findMany({
      where: { deckId: deck.id },
      select: { hanzi: true }
    })
    const existingHanzi = new Set(existingCards.map((c: { hanzi: string }) => c.hanzi))

    // Use streaming to avoid Heroku's 30s timeout
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial heartbeat
          controller.enqueue(encoder.encode('{"status":"processing"}\n'))

          let lessonContext = ""

          // Generate lesson context if lesson mode is not "none"
          if (data.lessonMode && data.lessonMode !== "none") {
            controller.enqueue(encoder.encode('{"status":"generating_context"}\n'))

            const contextStream = await anthropic.messages.stream({
              model: "claude-sonnet-4-5-20250929",
              max_tokens: 8192,
              messages: [
                {
                  role: "user",
                  content: `${LESSON_CONTEXT_PROMPT}\n\nLesson Notes:\n${data.notes}`
                }
              ]
            })

            let contextText = ""
            for await (const event of contextStream) {
              if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                contextText += event.delta.text
                controller.enqueue(encoder.encode('{"status":"generating_context"}\n'))
              }
            }

            const contextMessage = await contextStream.finalMessage()
            if (contextMessage.stop_reason === "max_tokens") {
              logger.warn("Lesson context was truncated", { deckId: deck.id })
            }

            lessonContext = contextText.trim()
            logger.info("Lesson context generated", { deckId: deck.id, length: lessonContext.length })
          }

          // Parse cards
          controller.enqueue(encoder.encode('{"status":"parsing_cards"}\n'))

          const cardsStream = await anthropic.messages.stream({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 16384,
            messages: [
              {
                role: "user",
                content: `${PARSE_NOTES_PROMPT}\n\nLesson Notes:\n${data.notes}`
              }
            ]
          })

          let fullText = ""

          // Collect the streamed response
          for await (const event of cardsStream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              fullText += event.delta.text
              // Send heartbeat every so often to keep connection alive
              controller.enqueue(encoder.encode('{"status":"streaming"}\n'))
            }
          }

          const finalMessage = await cardsStream.finalMessage()

          // Check if response was truncated
          if (finalMessage.stop_reason === "max_tokens") {
            controller.enqueue(encoder.encode(JSON.stringify({
              error: "Response was too long and got truncated. Try with shorter notes."
            }) + '\n'))
            controller.close()
            return
          }

          // Parse the response
          let jsonText = fullText.trim()
          const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
          if (codeBlockMatch) {
            jsonText = codeBlockMatch[1].trim()
          }

          const parsedCards = JSON.parse(jsonText) as ParsedCard[]

          if (!Array.isArray(parsedCards)) {
            throw new Error("Response is not an array")
          }

          // Mark duplicates
          const cardsWithDuplicateInfo = parsedCards.map((card) => ({
            ...card,
            isDuplicate: existingHanzi.has(card.hanzi)
          }))

          // Send final result
          const result = {
            cards: cardsWithDuplicateInfo,
            lessonContext: lessonContext || undefined,
            lessonNumber: data.lessonNumber,
            lessonTitle: data.lessonTitle,
            lessonMode: data.lessonMode,
            selectedLessonId: data.selectedLessonId,
            totalParsed: parsedCards.length,
            duplicatesFound: cardsWithDuplicateInfo.filter((c) => c.isDuplicate).length
          }

          logger.info("Notes parsed successfully", {
            deckId: deck.id,
            totalParsed: parsedCards.length,
            duplicates: cardsWithDuplicateInfo.filter((c) => c.isDuplicate).length,
            hasLessonContext: !!lessonContext
          })

          controller.enqueue(encoder.encode(JSON.stringify(result) + '\n'))
          controller.close()
        } catch (error) {
          logger.error("Streaming error during note parsing", { error, deckId: deck.id })
          controller.enqueue(encoder.encode(JSON.stringify({
            error: error instanceof Error ? error.message : "Failed to parse notes"
          }) + '\n'))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Transfer-Encoding": "chunked"
      }
    })
  } catch (error) {
    logger.error("Failed to parse notes", { error })
    return handleRouteError(error)
  }
}
