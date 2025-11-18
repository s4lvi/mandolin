import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { bulkCreateCardsSchema } from "@/lib/validations/card"

// POST /api/cards/bulk - Create multiple cards at once
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = bulkCreateCardsSchema.parse(body)

    // Get user's deck
    const deck = await prisma.deck.findFirst({
      where: { userId: session.user.id }
    })

    if (!deck) {
      return NextResponse.json({ error: "No deck found" }, { status: 404 })
    }

    // Get existing cards to check for duplicates
    const existingCards = await prisma.card.findMany({
      where: { deckId: deck.id },
      select: { hanzi: true }
    })
    const existingHanzi = new Set(existingCards.map((c: { hanzi: string }) => c.hanzi))

    const createdCards = []
    const duplicates: string[] = []

    for (const cardData of data.cards) {
      if (existingHanzi.has(cardData.hanzi)) {
        duplicates.push(cardData.hanzi)
        continue
      }

      // Create card
      const card = await prisma.card.create({
        data: {
          hanzi: cardData.hanzi,
          pinyin: cardData.pinyin,
          english: cardData.english,
          notes: cardData.notes,
          type: cardData.type,
          lessonId: data.lessonId || cardData.lessonId,
          deckId: deck.id,
          tags: cardData.tags
            ? {
                create: await Promise.all(
                  cardData.tags.map(async (tagName) => {
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

      createdCards.push(card)
      existingHanzi.add(cardData.hanzi)
    }

    return NextResponse.json(
      {
        cards: createdCards,
        duplicates,
        created: createdCards.length,
        skipped: duplicates.length
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating cards:", error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Failed to create cards" },
      { status: 500 }
    )
  }
}
