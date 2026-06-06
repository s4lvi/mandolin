import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

// GET /api/courses/[slug] — Course detail with lessons and user progress
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    const { slug } = await params

    const course = await prisma.course.findUnique({
      where: { slug },
      include: {
        lessons: {
          orderBy: { order: "asc" },
          include: {
            _count: { select: { cards: true } }
          }
        },
        enrollments: userId ? {
          where: { userId },
          take: 1
        } : false
      }
    })

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Visible if built-in, published, or owned by the requesting user.
    const isOwner = !!userId && course.userId === userId
    if (!course.isBuiltIn && !course.isPublished && !isOwner) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    const enrollment = Array.isArray(course.enrollments) ? course.enrollments[0] : null

    // Get progress for each lesson
    const lessonProgress: Record<string, { status: string; lessonId: string | null }> = {}
    if (userId) {
      const progress = await prisma.courseLessonProgress.findMany({
        where: {
          userId,
          courseLesson: { courseId: course.id }
        },
        select: {
          courseLessonId: true,
          status: true,
          lessonId: true
        }
      })
      for (const p of progress) {
        lessonProgress[p.courseLessonId] = { status: p.status, lessonId: p.lessonId }
      }
    }

    return NextResponse.json({
      course: {
        id: course.id,
        slug: course.slug,
        title: course.title,
        description: course.description,
        level: course.level,
        imageUrl: course.imageUrl,
        isBuiltIn: course.isBuiltIn,
        isPublished: course.isPublished,
        isMine: isOwner,
        totalLessons: course.lessons.length
      },
      enrollment: enrollment ? {
        currentLessonOrder: enrollment.currentLessonOrder,
        completedAt: enrollment.completedAt,
        enrolledAt: enrollment.enrolledAt
      } : null,
      lessons: course.lessons.map((lesson) => {
        const progress = lessonProgress[lesson.id]
        // Determine status: default LOCKED, but unlock anything up to the enrolled
        // current lesson when there's no explicit progress record yet.
        let status = progress?.status || "LOCKED"
        if (!progress && enrollment && lesson.order <= enrollment.currentLessonOrder) {
          status = "UNLOCKED"
        }
        return {
          id: lesson.id,
          order: lesson.order,
          title: lesson.title,
          description: lesson.description,
          cardCount: lesson._count.cards,
          status,
          lessonId: progress?.lessonId || null
        }
      })
    })
  } catch (error) {
    console.error("Error fetching course:", error)
    return NextResponse.json({ error: "Failed to fetch course" }, { status: 500 })
  }
}
