import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { z } from "zod"

const createCourseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  level: z.number().min(1).max(6).default(1),
  lessonIds: z.array(z.string()).min(1, "At least one lesson required")
})

// POST /api/courses/create — Create a course from existing lessons and publish it
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = session.user.id

    const body = await req.json()
    const data = createCourseSchema.parse(body)

    // Verify all lessons belong to the user and have cards
    const deck = await prisma.deck.findFirst({
      where: { userId: session.user.id }
    })

    if (!deck) {
      return NextResponse.json({ error: "No deck found" }, { status: 404 })
    }

    const lessons = await prisma.lesson.findMany({
      where: {
        id: { in: data.lessonIds },
        deckId: deck.id
      },
      include: {
        cards: {
          include: {
            card: { include: { tags: { include: { tag: true } } } }
          },
          orderBy: { order: "asc" }
        }
      },
      orderBy: { number: "asc" }
    })

    if (lessons.length !== data.lessonIds.length) {
      return NextResponse.json({ error: "Some lessons not found" }, { status: 404 })
    }

    const emptyLessons = lessons.filter(l => l.cards.length === 0)
    if (emptyLessons.length > 0) {
      return NextResponse.json({ error: "All lessons must have cards" }, { status: 400 })
    }

    // Generate a slug from the title
    const baseSlug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 50)
    const slug = `${baseSlug}-${Date.now().toString(36)}`

    // Create everything in a transaction for atomicity
    const course = await prisma.$transaction(async (tx) => {
      const newCourse = await tx.course.create({
        data: {
          slug,
          title: data.title,
          description: data.description,
          level: data.level,
          isBuiltIn: false,
          userId,
          totalLessons: lessons.length
        }
      })

      // Preserve selection order from the client; flatten join rows to cards
      const orderedLessons = data.lessonIds.map((id, i) => {
        const lesson = lessons.find(l => l.id === id)!
        return { ...lesson, order: i + 1, cardList: lesson.cards.map(cl => cl.card) }
      })

      for (const lesson of orderedLessons) {
        await tx.courseLesson.create({
          data: {
            courseId: newCourse.id,
            order: lesson.order,
            title: lesson.title || `Lesson ${lesson.number}`,
            description: `${lesson.cardList.length} cards`,
            notes: lesson.notes,
            cards: {
              create: lesson.cardList.map((card, cardIndex) => ({
                hanzi: card.hanzi,
                pinyin: card.pinyin,
                english: card.english,
                notes: card.notes,
                type: card.type,
                order: cardIndex,
                tags: card.tags.map(t => t.tag.name)
              }))
            }
          }
        })
      }

      return newCourse
    })

    return NextResponse.json({
      course: {
        id: course.id,
        slug: course.slug,
        title: course.title,
        totalLessons: lessons.length
      }
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating course:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create course" }, { status: 500 })
  }
}
