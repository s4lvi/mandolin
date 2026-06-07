import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { copyCardsToDeck } from "@/lib/deck-import"

// POST /api/community/lessons/[id]/add — Add a published lesson to your deck
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const published = await prisma.publishedLesson.findUnique({
      where: { id }
    })

    if (!published) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Fetch fresh card data from the source lesson (cards may have been edited since publishing)
    const sourceLesson = await prisma.lesson.findUnique({
      where: { id: published.lessonId },
      include: {
        cards: {
          include: { card: { include: { tags: { include: { tag: true } } } } },
          orderBy: { order: "asc" }
        }
      }
    })

    if (!sourceLesson || sourceLesson.cards.length === 0) {
      return NextResponse.json({ error: "Source lesson no longer has cards" }, { status: 410 })
    }

    const sourceCards = sourceLesson.cards.map((cl) => cl.card)

    // Get user's deck
    const deck = await prisma.deck.findFirst({
      where: { userId: session.user.id }
    })

    if (!deck) {
      return NextResponse.json({ error: "No deck found" }, { status: 404 })
    }

    // Create lesson and copy cards atomically
    const result = await prisma.$transaction((tx) =>
      copyCardsToDeck(
        tx,
        deck.id,
        sourceCards.map((c) => ({
          hanzi: c.hanzi,
          pinyin: c.pinyin,
          english: c.english,
          notes: c.notes,
          type: c.type,
          tags: c.tags.map((t) => t.tag.name)
        })),
        { title: published.title, notes: sourceLesson.notes, sourceType: "COMMUNITY" }
      )
    )

    // Increment add count only when at least one new card was actually added
    if (result.created > 0) {
      await prisma.publishedLesson.update({
        where: { id },
        data: { addCount: { increment: 1 } }
      })
    }

    return NextResponse.json({
      lessonId: result.lesson.id,
      created: result.created,
      duplicates: result.duplicates
    })
  } catch (error) {
    console.error("Error adding community lesson:", error)
    return NextResponse.json({ error: "Failed to add lesson" }, { status: 500 })
  }
}
