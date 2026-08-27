import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { z } from "zod"
import { updateLessonSchema } from "@/lib/validations/lesson"
import { markLessonPagesStale } from "@/lib/deck-import"

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
    const parsed = updateLessonSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parsed.error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message
          }))
        },
        { status: 400 }
      )
    }
    const body = parsed.data

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
    const newNumber = body.number
    if (newNumber !== undefined) {
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

    // Update only the fields present in the body
    const updatedLesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        ...(newNumber !== undefined ? { number: newNumber } : {}),
        ...(body.title !== undefined ? { title: body.title || null } : {}),
        ...(body.date !== undefined ? { date: body.date ? new Date(body.date) : null } : {}),
        ...(body.notes !== undefined ? { notes: body.notes || null } : {})
      }
    })

    // Generated pages are built from the notes, so a notes change makes them stale
    if (body.notes !== undefined && (body.notes || null) !== existingLesson.notes) {
      await markLessonPagesStale(prisma, [lessonId])
    }

    return NextResponse.json(updatedLesson)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }
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

    // Delete orphan cards (if requested) and the lesson atomically
    const deletedCards = await prisma.$transaction(async (tx) => {
      let deletedCards = 0

      if (deleteCards) {
        // Find cards in this lesson, then delete only the ones not also in another
        // lesson (so shared cards aren't yanked out of other lessons).
        const links = await tx.cardLesson.findMany({
          where: { lessonId },
          select: { cardId: true }
        })
        const cardIds = links.map((l) => l.cardId)

        if (cardIds.length > 0) {
          const otherLinks = await tx.cardLesson.findMany({
            where: { cardId: { in: cardIds }, lessonId: { not: lessonId } },
            select: { cardId: true }
          })
          const sharedCardIds = new Set(otherLinks.map((l) => l.cardId))
          const orphanCardIds = cardIds.filter((id) => !sharedCardIds.has(id))

          if (orphanCardIds.length > 0) {
            const res = await tx.card.deleteMany({ where: { id: { in: orphanCardIds } } })
            deletedCards = res.count
          }
        }
      }

      // Delete the lesson (CardLesson links cascade; cards otherwise stay in the deck)
      await tx.lesson.delete({ where: { id: lessonId } })

      return deletedCards
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
