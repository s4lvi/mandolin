import { NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { getAuthenticatedUserDeck } from "@/lib/api-helpers"

const associateLessonSchema = z.object({
  cardIds: z.array(z.string()).min(1, "At least one card ID is required"),
  lessonId: z.string().min(1, "Lesson ID is required"),
  mode: z.enum(["add", "move"]).default("add") // 'add' only unassociated, 'move' all cards
})

// POST /api/cards/associate-lesson - Associate multiple cards with a lesson
export async function POST(req: Request) {
  try {
    // Authenticate and get user's deck
    const { error, deck, userId } = await getAuthenticatedUserDeck()
    if (error) return error

    // Parse and validate request body
    const body = await req.json()
    const data = associateLessonSchema.parse(body)

    // Verify lesson exists and belongs to user's deck
    const lesson = await prisma.lesson.findUnique({
      where: { id: data.lessonId }
    })

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    if (lesson.deckId !== deck.id) {
      return NextResponse.json({ error: "Lesson does not belong to your deck" }, { status: 403 })
    }

    // Build where clause based on mode
    const whereClause: { id: { in: string[] }; deckId: string; lessonId?: null } = {
      id: { in: data.cardIds },
      deckId: deck.id
    }

    // If mode is 'add', only update cards with no lesson
    if (data.mode === "add") {
      whereClause.lessonId = null
    }
    // If mode is 'move', update all cards regardless of current lesson

    // Update cards
    const result = await prisma.card.updateMany({
      where: whereClause,
      data: { lessonId: data.lessonId }
    })

    // If no cards were updated in 'add' mode, they might already have lessons
    if (result.count === 0 && data.mode === "add") {
      // Check how many cards already have lessons
      const cardsWithLessons = await prisma.card.count({
        where: {
          id: { in: data.cardIds },
          deckId: deck.id,
          lessonId: { not: null }
        }
      })

      if (cardsWithLessons > 0) {
        return NextResponse.json(
          {
            error: `${cardsWithLessons} card(s) are already in other lessons`,
            suggestion: "Use mode='move' to reassign them"
          },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
      lessonTitle: lesson.title || `Lesson ${lesson.number}`,
      mode: data.mode
    })
  } catch (error) {
    console.error("Error associating cards with lesson:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to associate cards with lesson" },
      { status: 500 }
    )
  }
}
