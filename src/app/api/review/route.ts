import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { z } from "zod"
import { CardType } from "@prisma/client"

const reviewResultSchema = z.object({
  cardId: z.string(),
  correct: z.boolean()
})

// GET /api/review - Get cards for review
export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get("limit") || "20")
    const lessonId = searchParams.get("lessonId")
    const type = searchParams.get("type")

    // Get user's deck
    const deck = await prisma.deck.findFirst({
      where: { userId: session.user.id }
    })

    if (!deck) {
      return NextResponse.json({ cards: [] })
    }

    // Build where clause
    const where: {
      deckId: string
      lessonId?: string
      type?: CardType
    } = { deckId: deck.id }

    if (lessonId) {
      where.lessonId = lessonId
    }

    if (type && Object.values(CardType).includes(type as CardType)) {
      where.type = type as CardType
    }

    // Get cards, prioritizing those due for review or never reviewed
    const cards = await prisma.card.findMany({
      where,
      include: {
        lesson: {
          select: { number: true, title: true }
        },
        tags: {
          include: {
            tag: true
          }
        }
      },
      orderBy: [
        { lastReviewed: "asc" }, // Never reviewed first (null)
        { incorrectCount: "desc" } // Then most incorrect
      ],
      take: limit
    })

    return NextResponse.json({ cards })
  } catch (error) {
    console.error("Error fetching review cards:", error)
    return NextResponse.json(
      { error: "Failed to fetch cards" },
      { status: 500 }
    )
  }
}

// POST /api/review - Submit review result
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { cardId, correct } = reviewResultSchema.parse(body)

    // Verify card belongs to user
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        deck: {
          select: { userId: true }
        }
      }
    })

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 })
    }

    if (card.deck.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Update card with review result
    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: {
        correctCount: correct ? { increment: 1 } : undefined,
        incorrectCount: !correct ? { increment: 1 } : undefined,
        lastReviewed: new Date()
      }
    })

    return NextResponse.json({ card: updatedCard })
  } catch (error) {
    console.error("Error submitting review:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to submit review" },
      { status: 500 }
    )
  }
}
