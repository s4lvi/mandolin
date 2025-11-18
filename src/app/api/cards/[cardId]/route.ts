import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { updateCardSchema } from "@/lib/validations/card"

// GET /api/cards/[cardId] - Get a single card
export async function GET(
  req: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { cardId } = await params

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        deck: {
          select: { userId: true }
        },
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

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 })
    }

    // Check ownership
    if (card.deck.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({ card })
  } catch (error) {
    console.error("Error fetching card:", error)
    return NextResponse.json(
      { error: "Failed to fetch card" },
      { status: 500 }
    )
  }
}

// PUT /api/cards/[cardId] - Update a card
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { cardId } = await params
    const body = await req.json()
    const data = updateCardSchema.parse(body)

    // Check card exists and user owns it
    const existingCard = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        deck: {
          select: { userId: true }
        }
      }
    })

    if (!existingCard) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 })
    }

    if (existingCard.deck.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

      // Create new tags
      for (const tagName of data.tags) {
        const tag = await prisma.tag.upsert({
          where: { name: tagName },
          update: {},
          create: { name: tagName }
        })
        await prisma.cardTag.create({
          data: { cardId, tagId: tag.id }
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

    return NextResponse.json({ card })
  } catch (error) {
    console.error("Error updating card:", error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Failed to update card" },
      { status: 500 }
    )
  }
}

// DELETE /api/cards/[cardId] - Delete a card
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { cardId } = await params

    // Check card exists and user owns it
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

    await prisma.card.delete({
      where: { id: cardId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting card:", error)
    return NextResponse.json(
      { error: "Failed to delete card" },
      { status: 500 }
    )
  }
}
