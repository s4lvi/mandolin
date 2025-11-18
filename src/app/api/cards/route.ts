import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { createCardSchema } from "@/lib/validations/card"
import { CardType } from "@prisma/client"

// GET /api/cards - Get all cards for the user's deck
export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const lessonId = searchParams.get("lessonId")
    const type = searchParams.get("type")
    const tag = searchParams.get("tag")

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
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json({ cards })
  } catch (error) {
    console.error("Error fetching cards:", error)
    return NextResponse.json(
      { error: "Failed to fetch cards" },
      { status: 500 }
    )
  }
}

// POST /api/cards - Create a new card
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = createCardSchema.parse(body)

    // Get user's deck
    const deck = await prisma.deck.findFirst({
      where: { userId: session.user.id }
    })

    if (!deck) {
      return NextResponse.json({ error: "No deck found" }, { status: 404 })
    }

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
        tags: data.tags
          ? {
              create: await Promise.all(
                data.tags.map(async (tagName) => {
                  const tag = await prisma.tag.upsert({
                    where: { name: tagName },
                    update: {},
                    create: { name: tagName }
                  })
                  return { tagId: tag.id }
                })
              )
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

    return NextResponse.json({ card }, { status: 201 })
  } catch (error) {
    console.error("Error creating card:", error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Failed to create card" },
      { status: 500 }
    )
  }
}
