import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { updateCardSchema } from "@/lib/validations/card"
import { getAuthenticatedUser, verifyCardOwnership } from "@/lib/api-helpers"
import { handleRouteError } from "@/lib/error-handler"
import { createLogger } from "@/lib/logger"

const logger = createLogger("api/cards/[cardId]")

// GET /api/cards/[cardId] - Get a single card
export async function GET(
  req: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { error, userId } = await getAuthenticatedUser()
    if (error) return error

    const { cardId } = await params

    // Verify ownership
    const hasAccess = await verifyCardOwnership(cardId, userId)
    if (!hasAccess) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 })
    }

    const card = await prisma.card.findUnique({
      where: { id: cardId },
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

    return NextResponse.json({ card })
  } catch (error) {
    logger.error("Failed to fetch card", { error })
    return handleRouteError(error)
  }
}

// PUT /api/cards/[cardId] - Update a card
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { error, userId } = await getAuthenticatedUser()
    if (error) return error

    const { cardId } = await params

    // Verify ownership
    const hasAccess = await verifyCardOwnership(cardId, userId)
    if (!hasAccess) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 })
    }

    const body = await req.json()
    const data = updateCardSchema.parse(body)

    // Get existing card for duplicate check
    const existingCard = await prisma.card.findUnique({
      where: { id: cardId },
      select: { hanzi: true, deckId: true }
    })

    if (!existingCard) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 })
    }

    // If hanzi is being changed, check for duplicates
    if (data.hanzi && data.hanzi !== existingCard.hanzi) {
      const duplicate = await prisma.card.findUnique({
        where: {
          deckId_hanzi: {
            deckId: existingCard.deckId,
            hanzi: data.hanzi
          }
        }
      })

      if (duplicate) {
        return NextResponse.json(
          { error: "Card with this hanzi already exists" },
          { status: 400 }
        )
      }
    }

    // Handle tags update
    if (data.tags) {
      // Delete existing tags
      await prisma.cardTag.deleteMany({
        where: { cardId }
      })

      // Batch create/get tags
      if (data.tags.length > 0) {
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

        // Create CardTag relationships in batch
        await prisma.cardTag.createMany({
          data: allTags.map((tag) => ({
            cardId,
            tagId: tag.id
          }))
        })
      }
    }

    // Update card
    const card = await prisma.card.update({
      where: { id: cardId },
      data: {
        hanzi: data.hanzi,
        pinyin: data.pinyin,
        english: data.english,
        notes: data.notes,
        type: data.type,
        lessonId: data.lessonId
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

    logger.info("Updated card", { cardId, hanzi: card.hanzi })
    return NextResponse.json({ card })
  } catch (error) {
    logger.error("Failed to update card", { error })
    return handleRouteError(error)
  }
}

// DELETE /api/cards/[cardId] - Delete a card
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { error, userId } = await getAuthenticatedUser()
    if (error) return error

    const { cardId } = await params

    // Verify ownership
    const hasAccess = await verifyCardOwnership(cardId, userId)
    if (!hasAccess) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 })
    }

    await prisma.card.delete({
      where: { id: cardId }
    })

    logger.info("Deleted card", { cardId })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("Failed to delete card", { error })
    return handleRouteError(error)
  }
}
