import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

// POST /api/courses/[slug]/enroll — Enroll in a course
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { slug } = await params

    const course = await prisma.course.findUnique({
      where: { slug },
      include: {
        lessons: {
          where: { order: 1 },
          take: 1
        }
      }
    })

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Only built-in, published, or owned courses can be enrolled in
    const isOwner = course.userId === session.user.id
    if (!course.isBuiltIn && !course.isPublished && !isOwner) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Check if already enrolled
    const existing = await prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: course.id
        }
      }
    })

    if (existing) {
      return NextResponse.json({ enrollment: existing })
    }

    // Create enrollment and unlock first lesson
    const enrollment = await prisma.courseEnrollment.create({
      data: {
        userId: session.user.id,
        courseId: course.id,
        currentLessonOrder: 1
      }
    })

    // Create progress record for first lesson as UNLOCKED
    if (course.lessons[0]) {
      await prisma.courseLessonProgress.create({
        data: {
          userId: session.user.id,
          courseLessonId: course.lessons[0].id,
          status: "UNLOCKED"
        }
      })
    }

    return NextResponse.json({ enrollment }, { status: 201 })
  } catch (error) {
    console.error("Error enrolling in course:", error)
    return NextResponse.json({ error: "Failed to enroll" }, { status: 500 })
  }
}
