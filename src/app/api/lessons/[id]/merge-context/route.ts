import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUserDeck } from "@/lib/api-helpers"
import { markLessonPagesStale } from "@/lib/deck-import"
import { CLAUDE_MODEL_SMART, MERGE_CONTEXT_SYSTEM, MERGE_CONTEXT_USER } from "@/lib/constants"
import { getAnthropic, cachedSystem, logUsage, anthropicErrorResponse } from "@/lib/ai"
import { createLogger } from "@/lib/logger"
import { z } from "zod"
import { rateLimited, RATE_LIMITS } from "@/lib/rate-limit"

const logger = createLogger("api/lessons/merge-context")

const mergeContextSchema = z.object({
  newContext: z.string().min(1)
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, deck } = await getAuthenticatedUserDeck()
    if (error) return error

    const limited = rateLimited(`ai:heavy:${deck.userId}`, RATE_LIMITS.AI_HEAVY)
    if (limited) return limited

    const { id: lessonId } = await params

    // Validate request body
    const body = await req.json()
    const validationResult = mergeContextSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { newContext } = validationResult.data

    // Fetch the lesson and verify ownership
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        deckId: deck.id
      }
    })

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    // If no existing notes, just use the new context
    if (!lesson.notes) {
      const updated = await prisma.lesson.update({
        where: { id: lessonId },
        data: { notes: newContext }
      })
      await markLessonPagesStale(prisma, [lessonId])

      return NextResponse.json({
        success: true,
        notes: updated.notes
      })
    }

    // Use AI to merge the contexts
    const userMessage = MERGE_CONTEXT_USER
      .replace("{EXISTING_CONTEXT}", () => lesson.notes ?? "")
      .replace("{NEW_CONTEXT}", () => newContext)

    const message = await getAnthropic().messages.create({
      model: CLAUDE_MODEL_SMART,
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      output_config: { effort: "low" },
      system: cachedSystem(MERGE_CONTEXT_SYSTEM),
      messages: [{ role: "user", content: userMessage }]
    })
    logUsage(logger, "merge context", message.usage)

    const textBlock = message.content.find((block) => block.type === "text")
    if (!textBlock) {
      logger.error("Merge context returned no text", { stopReason: message.stop_reason })
      return NextResponse.json({ error: "AI returned an unexpected response" }, { status: 502 })
    }

    const mergedContext = textBlock.text.trim()

    // Update the lesson with merged context
    const updated = await prisma.lesson.update({
      where: { id: lessonId },
      data: { notes: mergedContext }
    })
    await markLessonPagesStale(prisma, [lessonId])

    return NextResponse.json({
      success: true,
      notes: updated.notes
    })
  } catch (error) {
    const aiError = anthropicErrorResponse(error)
    if (aiError) return aiError
    logger.error("Error merging lesson context", { error })
    return NextResponse.json(
      { error: "Failed to merge lesson context" },
      { status: 500 }
    )
  }
}
