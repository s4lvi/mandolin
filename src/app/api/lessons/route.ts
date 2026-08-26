import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { z } from "zod"

const createLessonSchema = z.object({
  number: z.number().int().positive(),
  title: z.string().max(200).optional(),
  date: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
    .optional(),
  notes: z.string().max(20000).optional()
})

// GET /api/lessons - Get all lessons for user's deck with progress
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's deck
    const deck = await prisma.deck.findFirst({
      where: { userId: session.user.id }
    })

    if (!deck) {
      return NextResponse.json({ lessons: [] })
    }

    const lessons = await prisma.lesson.findMany({
      where: { deckId: deck.id },
      include: {
        _count: {
          select: { cards: true, pages: true }
        },
        progress: {
          where: { userId: session.user.id }
        }
      },
      orderBy: { number: "desc" }
    })

    // Map lessons with interactive lesson progress
    const lessonsWithProgress = lessons.map((lesson) => {
      const userProgress = lesson.progress[0] // One progress per user per lesson

      return {
        id: lesson.id,
        number: lesson.number,
        title: lesson.title,
        date: lesson.date,
        notes: lesson.notes,
        _count: lesson._count,
        lessonProgress: userProgress ? {
          currentPage: userProgress.currentPage,
          totalPages: userProgress.totalPages,
          completedAt: userProgress.completedAt,
          isComplete: !!userProgress.completedAt
        } : null
      }
    })

    return NextResponse.json({ lessons: lessonsWithProgress })
  } catch (error) {
    console.error("Error fetching lessons:", error)
    return NextResponse.json(
      { error: "Failed to fetch lessons" },
      { status: 500 }
    )
  }
}

// POST /api/lessons - Create a new lesson
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = createLessonSchema.parse(body)

    // Get user's deck
    const deck = await prisma.deck.findFirst({
      where: { userId: session.user.id }
    })

    if (!deck) {
      return NextResponse.json({ error: "No deck found" }, { status: 404 })
    }

    // Check if lesson number already exists
    const existing = await prisma.lesson.findUnique({
      where: {
        deckId_number: {
          deckId: deck.id,
          number: data.number
        }
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: "Lesson number already in use" },
        { status: 409 }
      )
    }

    const lesson = await prisma.lesson.create({
      data: {
        number: data.number,
        title: data.title,
        date: data.date ? new Date(data.date) : undefined,
        notes: data.notes,
        deckId: deck.id
      }
    })

    return NextResponse.json({ lesson }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message
          }))
        },
        { status: 400 }
      )
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Lesson number already in use" },
        { status: 409 }
      )
    }
    console.error("Error creating lesson:", error)
    return NextResponse.json(
      { error: "Failed to create lesson" },
      { status: 500 }
    )
  }
}
