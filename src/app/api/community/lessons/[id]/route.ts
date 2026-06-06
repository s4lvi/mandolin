import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// GET /api/community/lessons/[id] — Published lesson detail with card preview
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const published = await prisma.publishedLesson.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        lesson: {
          include: {
            cards: {
              select: {
                hanzi: true,
                pinyin: true,
                english: true,
                type: true,
                notes: true
              },
              orderBy: { createdAt: "asc" }
            }
          }
        }
      }
    })

    if (!published) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: published.id,
      title: published.title,
      description: published.description,
      level: published.level,
      tags: published.tags,
      cardCount: published.cardCount,
      addCount: published.addCount,
      author: published.user.name || published.user.email?.split("@")[0],
      publishedAt: published.publishedAt,
      cards: published.lesson.cards
    })
  } catch (error) {
    console.error("Error fetching published lesson:", error)
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}
