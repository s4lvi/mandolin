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
            lesson: {
              select: { number: true, title: true }
            },
            tags: {
              include: {
                tag: true
              }
            }
          },
          orderBy: { createdAt: "asc" }
        },
        progress: {
          where: { userId: session.user.id }
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

    // Update lesson
    const updatedLesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        number: body.number,
        title: body.title || null,
        date: body.date ? new Date(body.date) : null,
        notes: body.notes || null
      }
    })

    return NextResponse.json(updatedLesson)
  } catch (error) {
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
      where: { id: lessonId }
    })

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    if (lesson.deckId !== deck.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Delete lesson (cards will have lessonId set to null due to onDelete: SetNull)
    await prisma.lesson.delete({
      where: { id: lessonId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting lesson:", error)
    return NextResponse.json(
      { error: "Failed to delete lesson" },
      { status: 500 }
    )
  }
}
