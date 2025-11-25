import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { createCardSchema } from "@/lib/validations/card"
import { CardType } from "@prisma/client"
import { getAuthenticatedUserDeck } from "@/lib/api-helpers"
import { handleRouteError } from "@/lib/error-handler"
import { createLogger } from "@/lib/logger"

const logger = createLogger("api/cards")

// GET /api/cards - Get all cards for the user's deck
export async function GET(req: Request) {
  try {
    const { error, deck } = await getAuthenticatedUserDeck()
    if (error) return error

    const { searchParams } = new URL(req.url)
    const lessonId = searchParams.get("lessonId")
    const type = searchParams.get("type")
    const tag = searchParams.get("tag")

    // Build where clause
    const where: {
      deckId: string
      lessonId?: string
      type?: CardType
      tags?: { some: { tag: { name: string } } }
    } = { deckId: deck.id }

    if (lessonId) {
      where.lessonId = lessonId
    }

    if (type && Object.values(CardType).includes(type as CardType)) {
      where.type = type as CardType
    }

    if (tag) {
      where.tags = {
        some: {
          tag: { name: tag }
        }
      }
    }

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
        { isPriority: "desc" as const }, // Priority cards first
        { createdAt: "desc" as const }   // Then newest first
      ]
    })

    logger.info("Fetched cards", { deckId: deck.id, count: cards.length })
    return NextResponse.json({ cards })
  } catch (error) {
    logger.error("Failed to fetch cards", { error })
    return handleRouteError(error)
  }
}

// POST /api/cards - Create a new card
export async function POST(req: Request) {
  try {
    const { error, deck } = await getAuthenticatedUserDeck()
    if (error) return error

    const body = await req.json()
    const data = createCardSchema.parse(body)

    // Check for duplicate
    const existing = await prisma.card.findUnique({
      where: {
        deckId_hanzi: {
          deckId: deck.id,
          hanzi: data.hanzi
        }
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: "Card with this hanzi already exists" },
        { status: 400 }
      )
    }

    // Batch create/get tags first
    let tagIds: string[] = []
    if (data.tags && data.tags.length > 0) {
      // Find existing tags
      const existingTags = await prisma.tag.findMany({
        where: { name: { in: data.tags } }
      })
      const existingTagNames = new Set(existingTags.map((t) => t.name))

      // Create missing tags in batch
      const newTagNames = data.tags.filter((name) => !existingTagNames.has(name))
      if (newTagNames.length > 0) {
        await prisma.tag.createMany({
          data: newTagNames.map((name) => ({ name })),
          skipDuplicates: true
        })
      }

      // Get all tags (existing + newly created)
      const allTags = await prisma.tag.findMany({
        where: { name: { in: data.tags } }
      })
      tagIds = allTags.map((tag) => tag.id)
    }

    // Create card
    const card = await prisma.card.create({
      data: {
        hanzi: data.hanzi,
        pinyin: data.pinyin,
        english: data.english,
        notes: data.notes,
        type: data.type,
        lessonId: data.lessonId,
        deckId: deck.id,
        tags: tagIds.length > 0
          ? {
              create: tagIds.map((tagId) => ({ tagId }))
            }
          : undefined
      },
      include: {
        lesson: {
          select: { number: true, title: true }
        },
        tags: {
          include: {
            tag: true
          }
        }
      }
    })

    logger.info("Created card", { cardId: card.id, hanzi: card.hanzi })
    return NextResponse.json({ card }, { status: 201 })
  } catch (error) {
    logger.error("Failed to create card", { error })
    return handleRouteError(error)
  }
}
