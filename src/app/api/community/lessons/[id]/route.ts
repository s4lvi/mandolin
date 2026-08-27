import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// GET /api/community/lessons/[id] — Published lesson detail with card preview
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const published = await prisma.publishedLesson.findFirst({
      where: { id, isApproved: true },
      include: {
        user: { select: { name: true } },
        lesson: {
          include: {
            cards: {
              include: {
                card: {
                  select: {
                    hanzi: true,
                    pinyin: true,
                    english: true,
                    type: true,
                    notes: true
                  }
                }
              },
              orderBy: [{ order: "asc" }, { card: { createdAt: "asc" } }]
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
      author: published.user.name || "Anonymous",
      publishedAt: published.publishedAt,
      notes: published.lesson.notes,
      cards: published.lesson.cards.map((cl) => cl.card)
    })
  } catch (error) {
    console.error("Error fetching published lesson:", error)
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}
