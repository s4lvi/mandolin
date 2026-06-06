import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { copyCardsToDeck } from "@/lib/deck-import"

// POST /api/courses/[slug]/lessons/[order]/start — Start a course lesson (copy cards to deck)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; order: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { slug, order: orderStr } = await params
    const order = parseInt(orderStr, 10)
    if (!Number.isInteger(order) || order < 1) {
      return NextResponse.json({ error: "Invalid lesson order" }, { status: 400 })
    }

    // Get course and verify enrollment
    const course = await prisma.course.findUnique({
      where: { slug }
    })

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Fetch fresh enrollment to avoid race conditions across devices
    const enrollment = await prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: course.id
        }
      }
    })

    if (!enrollment) {
      return NextResponse.json({ error: "Not enrolled in this course" }, { status: 403 })
    }

    if (order > enrollment.currentLessonOrder) {
      return NextResponse.json(
        { error: `Lesson ${order} is locked. Complete lesson ${enrollment.currentLessonOrder} first.` },
        { status: 403 }
      )
    }

    // Get the course lesson with its template cards
    const courseLesson = await prisma.courseLesson.findUnique({
      where: {
        courseId_order: { courseId: course.id, order }
      },
      include: {
        cards: { orderBy: { order: "asc" } }
      }
    })

    if (!courseLesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    // Check if already started (has a progress record with a lesson)
    const existingProgress = await prisma.courseLessonProgress.findUnique({
      where: {
        userId_courseLessonId: {
          userId: session.user.id,
          courseLessonId: courseLesson.id
        }
      }
    })

    if (existingProgress?.lessonId) {
      // Already started — return existing lesson
      return NextResponse.json({ lessonId: existingProgress.lessonId })
    }

    // Get user's deck
    const deck = await prisma.deck.findFirst({
      where: { userId: session.user.id }
    })

    if (!deck) {
      return NextResponse.json({ error: "No deck found" }, { status: 404 })
    }

    // Create the user lesson and copy cards atomically
    const result = await prisma.$transaction((tx) =>
      copyCardsToDeck(
        tx,
        deck.id,
        courseLesson.cards.map((c) => ({
          hanzi: c.hanzi,
          pinyin: c.pinyin,
          english: c.english,
          notes: c.notes,
          type: c.type,
          tags: c.tags
        })),
        { title: courseLesson.title, notes: courseLesson.notes, sourceType: "COURSE" }
      )
    )

    // Update or create progress
    await prisma.courseLessonProgress.upsert({
      where: {
        userId_courseLessonId: {
          userId: session.user.id,
          courseLessonId: courseLesson.id
        }
      },
      update: {
        status: "IN_PROGRESS",
        lessonId: result.lesson.id,
        startedAt: new Date()
      },
      create: {
        userId: session.user.id,
        courseLessonId: courseLesson.id,
        status: "IN_PROGRESS",
        lessonId: result.lesson.id,
        startedAt: new Date()
      }
    })

    return NextResponse.json({
      lessonId: result.lesson.id,
      created: result.created,
      duplicates: result.duplicates
    })
  } catch (error) {
    console.error("Error starting course lesson:", error)
    return NextResponse.json({ error: "Failed to start lesson" }, { status: 500 })
  }
}
