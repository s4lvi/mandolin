import { NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { getAuthenticatedUserDeck } from "@/lib/api-helpers"

const associateLessonSchema = z.object({
  cardIds: z.array(z.string()).min(1, "At least one card ID is required"),
  lessonId: z.string().min(1, "Lesson ID is required")
})

// POST /api/cards/associate-lesson — Link cards to a lesson (many-to-many).
// Cards can belong to multiple lessons; re-adding an already-linked card is a no-op.
export async function POST(req: Request) {
  try {
    const { error, deck } = await getAuthenticatedUserDeck()
    if (error) return error

    const body = await req.json()
    const data = associateLessonSchema.parse(body)

    // Verify lesson belongs to the user's deck
    const lesson = await prisma.lesson.findUnique({
      where: { id: data.lessonId }
    })

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    if (lesson.deckId !== deck.id) {
      return NextResponse.json({ error: "Lesson does not belong to your deck" }, { status: 403 })
    }

    // Restrict to cards that actually belong to the user's deck
    const ownedCards = await prisma.card.findMany({
      where: { id: { in: data.cardIds }, deckId: deck.id },
      select: { id: true }
    })

    const result = await prisma.cardLesson.createMany({
      data: ownedCards.map((c) => ({ cardId: c.id, lessonId: data.lessonId })),
      skipDuplicates: true
    })

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
      lessonTitle: lesson.title || `Lesson ${lesson.number}`
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
