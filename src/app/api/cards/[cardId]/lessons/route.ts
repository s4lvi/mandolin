import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { getAuthenticatedUserDeck } from "@/lib/api-helpers"
import { markLessonPagesStale } from "@/lib/deck-import"

const setLessonsSchema = z.object({
  lessonIds: z.array(z.string())
})

// PUT /api/cards/[cardId]/lessons — Replace a card's full set of lesson memberships.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { error, deck } = await getAuthenticatedUserDeck()
    if (error) return error

    const { cardId } = await params
    const { lessonIds } = setLessonsSchema.parse(await req.json())

    // Verify the card belongs to the user's deck
    const card = await prisma.card.findFirst({
      where: { id: cardId, deckId: deck.id },
      select: { id: true }
    })
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 })
    }

    // Keep only lessons that belong to the user's deck
    const validLessons = await prisma.lesson.findMany({
      where: { id: { in: lessonIds }, deckId: deck.id },
      select: { id: true }
    })
    const validIds = new Set(validLessons.map((l) => l.id))

    const existing = await prisma.cardLesson.findMany({
      where: { cardId },
      select: { lessonId: true }
    })
    const existingIds = new Set(existing.map((e) => e.lessonId))

    const toAdd = [...validIds].filter((id) => !existingIds.has(id))
    const toRemove = [...existingIds].filter((id) => !validIds.has(id))

    await prisma.$transaction(async (tx) => {
      await tx.cardLesson.createMany({
        data: toAdd.map((lessonId) => ({ cardId, lessonId })),
        skipDuplicates: true
      })
      await tx.cardLesson.deleteMany({
        where: { cardId, lessonId: { in: toRemove } }
      })
      await markLessonPagesStale(tx, [...toAdd, ...toRemove])
    })

    return NextResponse.json({ success: true, added: toAdd.length, removed: toRemove.length })
  } catch (error) {
    console.error("Error setting card lessons:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to update lessons" }, { status: 500 })
  }
}
