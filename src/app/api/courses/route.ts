import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

// GET /api/courses — List official courses plus the user's own, with enrollment status
export async function GET() {
  try {
    const session = await auth()
    const userId = session?.user?.id

    // Built-in courses and creator-published courses are public; a user always
    // sees their own courses (including private, unpublished ones).
    const where: Prisma.CourseWhereInput = userId
      ? { OR: [{ isBuiltIn: true }, { isPublished: true }, { userId }] }
      : { OR: [{ isBuiltIn: true }, { isPublished: true }] }

    const courses = await prisma.course.findMany({
      where,
      orderBy: { level: "asc" },
      include: {
        _count: { select: { lessons: true } },
        enrollments: userId ? { where: { userId }, take: 1 } : false
      }
    })

    // Tally completed lessons per course for the user in a single query (no N+1)
    const completedByCourse = new Map<string, number>()
    if (userId && courses.length > 0) {
      const completed = await prisma.courseLessonProgress.findMany({
        where: {
          userId,
          status: "COMPLETED",
          courseLesson: { courseId: { in: courses.map((c) => c.id) } }
        },
        select: { courseLesson: { select: { courseId: true } } }
      })
      for (const p of completed) {
        const courseId = p.courseLesson.courseId
        completedByCourse.set(courseId, (completedByCourse.get(courseId) ?? 0) + 1)
      }
    }

    const coursesWithProgress = courses.map((course) => {
      const enrollment = Array.isArray(course.enrollments) ? course.enrollments[0] : null
      return {
        id: course.id,
        slug: course.slug,
        title: course.title,
        description: course.description,
        level: course.level,
        imageUrl: course.imageUrl,
        isBuiltIn: course.isBuiltIn,
        isPublished: course.isPublished,
        isMine: !!userId && course.userId === userId,
        totalLessons: course._count.lessons,
        enrollment: enrollment
          ? {
              currentLessonOrder: enrollment.currentLessonOrder,
              completedAt: enrollment.completedAt,
              enrolledAt: enrollment.enrolledAt
            }
          : null,
        completedLessons: completedByCourse.get(course.id) ?? 0
      }
    })

    return NextResponse.json({ courses: coursesWithProgress })
  } catch (error) {
    console.error("Error fetching courses:", error)
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 })
  }
}
