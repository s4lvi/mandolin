import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

// GET /api/community/lessons — Browse published lessons
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search") || ""
    const level = searchParams.get("level")
    const sort = searchParams.get("sort") || "recent"
    const page = parseInt(searchParams.get("page") || "1")
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50)

    const where: Prisma.PublishedLessonWhereInput = { isApproved: true }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } }
      ]
    }

    if (level) {
      where.level = level
    }

    const orderBy = sort === "popular"
      ? { addCount: "desc" as const }
      : { publishedAt: "desc" as const }

    const [lessons, total] = await Promise.all([
      prisma.publishedLesson.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { name: true } }
        }
      }),
      prisma.publishedLesson.count({ where })
    ])

    return NextResponse.json({
      lessons: lessons.map(l => ({
        id: l.id,
        title: l.title,
        description: l.description,
        level: l.level,
        tags: l.tags,
        cardCount: l.cardCount,
        addCount: l.addCount,
        author: l.user.name || "Anonymous",
        publishedAt: l.publishedAt
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error("Error fetching community lessons:", error)
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}
