import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { bulkCreateCardsSchema } from "@/lib/validations/card"
import { getAuthenticatedUserDeck } from "@/lib/api-helpers"
import { handleRouteError } from "@/lib/error-handler"
import { createLogger } from "@/lib/logger"

const logger = createLogger("api/cards/bulk")

// POST /api/cards/bulk - Create multiple cards at once
export async function POST(req: Request) {
  try {
    const { error, deck } = await getAuthenticatedUserDeck()
    if (error) return error

    const body = await req.json()
    const data = bulkCreateCardsSchema.parse(body)

    // Get existing cards to check for duplicates
    const existingCards = await prisma.card.findMany({
      where: { deckId: deck.id },
      select: { hanzi: true }
    })
    const existingHanzi = new Set(existingCards.map((c: { hanzi: string }) => c.hanzi))

    const duplicates: string[] = []
    const cardsToCreate: typeof data.cards = []

    // Filter out duplicates first
    for (const cardData of data.cards) {
      if (existingHanzi.has(cardData.hanzi)) {
        duplicates.push(cardData.hanzi)
      } else {
        cardsToCreate.push(cardData)
        existingHanzi.add(cardData.hanzi)
      }
    }

    // Collect all unique tags
    const allTagNames = new Set<string>()
    for (const card of cardsToCreate) {
      if (card.tags) {
        for (const tag of card.tags) {
          allTagNames.add(tag)
        }
      }
    }

    // Batch create/get all tags
    const tagMap = new Map<string, string>()
    if (allTagNames.size > 0) {
      const tagNamesArray = Array.from(allTagNames)

      // Find existing tags
      const existingTags = await prisma.tag.findMany({
        where: { name: { in: tagNamesArray } }
      })
      const existingTagNames = new Set(existingTags.map((t) => t.name))

      // Create missing tags in batch
      const newTagNames = tagNamesArray.filter((name) => !existingTagNames.has(name))
      if (newTagNames.length > 0) {
        await prisma.tag.createMany({
          data: newTagNames.map((name) => ({ name })),
          skipDuplicates: true
        })
      }

      // Get all tags (existing + newly created)
      const allTags = await prisma.tag.findMany({
        where: { name: { in: tagNamesArray } }
      })

      // Build tag map for quick lookup
      allTags.forEach((tag) => tagMap.set(tag.name, tag.id))
    }

    // Create all cards in a transaction for speed
    const createdCards = await prisma.$transaction(
      cardsToCreate.map((cardData) =>
        prisma.card.create({
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
                  create: cardData.tags.map((tagName) => ({
                    tagId: tagMap.get(tagName)!
                  }))
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
      )
    )

    logger.info("Created cards in bulk", {
      deckId: deck.id,
      created: createdCards.length,
      skipped: duplicates.length
    })

    return NextResponse.json(
      {
        cards: createdCards,
        cardIds: createdCards.map((card) => card.id), // For lesson association
        duplicates,
        created: createdCards.length,
        skipped: duplicates.length
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error("Failed to create cards in bulk", { error })
    return handleRouteError(error)
  }
}
