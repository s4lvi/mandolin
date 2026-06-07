import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { getAuthenticatedUserDeck } from "@/lib/api-helpers"

const removeSchema = z.object({
  cardIds: z.array(z.string()).min(1, "At least one card ID is required")
})

// DELETE /api/lessons/[id]/cards — Remove cards from a lesson (unlink only; cards stay in the deck).
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, deck } = await getAuthenticatedUserDeck()
    if (error) return error

    const { id: lessonId } = await params
    const { cardIds } = removeSchema.parse(await req.json())

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { deckId: true }
    })
    if (!lesson || lesson.deckId !== deck.id) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    const result = await prisma.cardLesson.deleteMany({
      where: { lessonId, cardId: { in: cardIds } }
    })

    return NextResponse.json({ success: true, removed: result.count })
  } catch (error) {
    console.error("Error removing cards from lesson:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to remove cards" }, { status: 500 })
  }
}
