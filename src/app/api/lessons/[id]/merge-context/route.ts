import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"
import { getAuthenticatedUserDeck } from "@/lib/api-helpers"
import { CLAUDE_MODEL, MERGE_CONTEXT_PROMPT } from "@/lib/constants"
import { z } from "zod"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

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

      return NextResponse.json({
        success: true,
        notes: updated.notes
      })
    }

    // Use AI to merge the contexts
    const prompt = MERGE_CONTEXT_PROMPT
      .replace("{EXISTING_CONTEXT}", lesson.notes)
      .replace("{NEW_CONTEXT}", newContext)

    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    })

    const content = message.content[0]
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude")
    }

    const mergedContext = content.text.trim()

    // Update the lesson with merged context
    const updated = await prisma.lesson.update({
      where: { id: lessonId },
      data: { notes: mergedContext }
    })

    return NextResponse.json({
      success: true,
      notes: updated.notes
    })
  } catch (error) {
    console.error("Error merging lesson context:", error)
    return NextResponse.json(
      { error: "Failed to merge lesson context" },
      { status: 500 }
    )
  }
}
