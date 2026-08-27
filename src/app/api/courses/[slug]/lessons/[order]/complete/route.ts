import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

// POST /api/courses/[slug]/lessons/[order]/complete — Complete a course lesson, unlock next
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

    const course = await prisma.course.findUnique({
      where: { slug },
      include: {
        lessons: {
          where: { order: { in: [order, order + 1] } },
          orderBy: { order: "asc" }
        }
      }
    })

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    const currentLesson = course.lessons.find(l => l.order === order)
    const nextLesson = course.lessons.find(l => l.order === order + 1)

    if (!currentLesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    const enrollment = await prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: course.id
        }
      }
    })

    if (!enrollment) {
      return NextResponse.json({ error: "Not enrolled" }, { status: 403 })
    }

    // Verify the lesson was actually completed (interactive lesson finished)
    const lessonProgress = await prisma.courseLessonProgress.findUnique({
      where: {
        userId_courseLessonId: {
          userId: session.user.id,
          courseLessonId: currentLesson.id
        }
      },
      include: {
        lesson: {
          include: {
            progress: {
              where: { userId: session.user.id }
            }
          }
        }
      }
    })

    // Allow completion if the lesson was started (IN_PROGRESS), already completed
    // (idempotent re-complete / review), or the interactive lesson was finished.
    const interactiveCompleted = lessonProgress?.lesson?.progress?.[0]?.completedAt
    const status = lessonProgress?.status
    const eligible = status === "IN_PROGRESS" || status === "COMPLETED" || !!interactiveCompleted

    if (!eligible) {
      return NextResponse.json({ error: "Lesson not started" }, { status: 400 })
    }

    // Mark current lesson as completed
    await prisma.courseLessonProgress.upsert({
      where: {
        userId_courseLessonId: {
          userId: session.user.id,
          courseLessonId: currentLesson.id
        }
      },
      update: {
        status: "COMPLETED",
        completedAt: new Date()
      },
      create: {
        userId: session.user.id,
        courseLessonId: currentLesson.id,
        status: "COMPLETED",
        completedAt: new Date()
      }
    })

    // Unlock next lesson or complete the course
    if (nextLesson) {
      // Re-completing an earlier lesson must never rewind the enrollment pointer
      if (order + 1 > enrollment.currentLessonOrder) {
        await prisma.courseEnrollment.update({
          where: { id: enrollment.id },
          data: { currentLessonOrder: order + 1 }
        })
      }

      // Unlock the next lesson without downgrading a COMPLETED / IN_PROGRESS status
      const nextProgress = await prisma.courseLessonProgress.findUnique({
        where: {
          userId_courseLessonId: {
            userId: session.user.id,
            courseLessonId: nextLesson.id
          }
        },
        select: { id: true, status: true }
      })

      if (!nextProgress) {
        await prisma.courseLessonProgress.create({
          data: {
            userId: session.user.id,
            courseLessonId: nextLesson.id,
            status: "UNLOCKED"
          }
        })
      } else if (nextProgress.status === "LOCKED") {
        await prisma.courseLessonProgress.updateMany({
          where: { id: nextProgress.id, status: "LOCKED" },
          data: { status: "UNLOCKED" }
        })
      }

      return NextResponse.json({
        completed: true,
        nextLessonOrder: order + 1,
        courseCompleted: false
      })
    } else {
      // Last lesson — complete the course
      await prisma.courseEnrollment.update({
        where: { id: enrollment.id },
        data: { completedAt: new Date() }
      })

      return NextResponse.json({
        completed: true,
        nextLessonOrder: null,
        courseCompleted: true
      })
    }
  } catch (error) {
    console.error("Error completing course lesson:", error)
    return NextResponse.json({ error: "Failed to complete lesson" }, { status: 500 })
  }
}
