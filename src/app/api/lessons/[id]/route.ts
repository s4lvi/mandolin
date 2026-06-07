import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

// GET /api/lessons/[id] - Get lesson details with cards
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: lessonId } = await params

    // Get user's deck
    const deck = await prisma.deck.findFirst({
      where: { userId: session.user.id }
    })

    if (!deck) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 })
    }

    // Fetch lesson with all cards, progress, and page count
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        cards: {
          include: {
            card: {
              include: {
                lessons: {
                  include: { lesson: { select: { number: true, title: true } } }
                },
                tags: {
                  include: {
                    tag: true
                  }
                }
              }
            }
          },
          orderBy: { order: "asc" }
        },
        progress: {
          where: { userId: session.user.id }
        },
        publishedLesson: {
          select: { id: true, title: true, addCount: true }
        },
        _count: {
          select: { pages: true }
        }
      }
    })

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    // Verify lesson belongs to user's deck
    if (lesson.deckId !== deck.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Format lesson progress
    const userProgress = lesson.progress[0]
    const response = {
      ...lesson,
      cards: lesson.cards.map((cl) => cl.card), // flatten join rows to cards
      progress: undefined, // Remove raw progress array
      lessonProgress: userProgress ? {
        currentPage: userProgress.currentPage,
        totalPages: userProgress.totalPages,
        completedAt: userProgress.completedAt,
        isComplete: !!userProgress.completedAt
      } : null
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching lesson:", error)
    return NextResponse.json(
      { error: "Failed to fetch lesson" },
      { status: 500 }
    )
  }
}

// PUT /api/lessons/[id] - Update lesson
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: lessonId } = await params
    const body = await req.json()

    // Get user's deck
    const deck = await prisma.deck.findFirst({
      where: { userId: session.user.id }
    })

    if (!deck) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 })
    }

    // Verify lesson exists and belongs to user
    const existingLesson = await prisma.lesson.findUnique({
      where: { id: lessonId }
    })

    if (!existingLesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    if (existingLesson.deckId !== deck.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Validate a requested lesson number and reject conflicts (numbers are unique per deck)
    let newNumber: number | undefined
    if (body.number !== undefined && body.number !== null) {
      newNumber = Number(body.number)
      if (!Number.isInteger(newNumber) || newNumber < 1) {
        return NextResponse.json({ error: "Lesson number must be a positive whole number" }, { status: 400 })
      }
      if (newNumber !== existingLesson.number) {
        const clash = await prisma.lesson.findFirst({
          where: { deckId: deck.id, number: newNumber, id: { not: lessonId } },
          select: { id: true }
        })
        if (clash) {
          return NextResponse.json(
            { error: `Lesson ${newNumber} already exists. Choose a different number.` },
            { status: 409 }
          )
        }
      }
    }

    // Update lesson
    const updatedLesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        ...(newNumber !== undefined ? { number: newNumber } : {}),
        title: body.title || null,
        date: body.date ? new Date(body.date) : null,
        notes: body.notes || null
      }
    })

    return NextResponse.json(updatedLesson)
  } catch (error) {
    // Unique-constraint backstop in case of a concurrent renumber
    if (
      typeof error === "object" &&
      error !== null &&
      (error as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "That lesson number is already in use. Choose a different number." },
        { status: 409 }
      )
    }
    console.error("Error updating lesson:", error)
    return NextResponse.json(
      { error: "Failed to update lesson" },
      { status: 500 }
    )
  }
}

// DELETE /api/lessons/[id] - Delete lesson
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: lessonId } = await params

    // Get user's deck
    const deck = await prisma.deck.findFirst({
      where: { userId: session.user.id }
    })

    if (!deck) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 })
    }

    // Verify lesson exists and belongs to user
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { publishedLesson: { select: { id: true } } }
    })

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    if (lesson.deckId !== deck.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    if (lesson.publishedLesson) {
      return NextResponse.json(
        { error: "Cannot delete a published lesson. Unpublish it first." },
        { status: 400 }
      )
    }

    const deleteCards = new URL(req.url).searchParams.get("deleteCards") === "true"
    let deletedCards = 0

    if (deleteCards) {
      // Find cards in this lesson, then delete only the ones not also in another
      // lesson (so shared cards aren't yanked out of other lessons).
      const links = await prisma.cardLesson.findMany({
        where: { lessonId },
        select: { cardId: true }
      })
      const cardIds = links.map((l) => l.cardId)

      if (cardIds.length > 0) {
        const otherLinks = await prisma.cardLesson.findMany({
          where: { cardId: { in: cardIds }, lessonId: { not: lessonId } },
          select: { cardId: true }
        })
        const sharedCardIds = new Set(otherLinks.map((l) => l.cardId))
        const orphanCardIds = cardIds.filter((id) => !sharedCardIds.has(id))

        if (orphanCardIds.length > 0) {
          const res = await prisma.card.deleteMany({ where: { id: { in: orphanCardIds } } })
          deletedCards = res.count
        }
      }
    }

    // Delete the lesson (CardLesson links cascade; cards otherwise stay in the deck)
    await prisma.lesson.delete({
      where: { id: lessonId }
    })

    return NextResponse.json({ success: true, deletedCards })
  } catch (error) {
    console.error("Error deleting lesson:", error)
    return NextResponse.json(
      { error: "Failed to delete lesson" },
      { status: 500 }
    )
  }
}
