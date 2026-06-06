import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { z } from "zod"

const publishSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  level: z.string().optional(),
  tags: z.array(z.string()).default([])
})

// POST /api/lessons/[id]/publish — Publish a lesson to the community
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: lessonId } = await params
    const body = await req.json()
    const data = publishSchema.parse(body)

    // Verify lesson belongs to user
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        deck: { userId: session.user.id }
      },
      include: {
        _count: { select: { cards: true } },
        publishedLesson: true
      }
    })

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    if (lesson.publishedLesson) {
      return NextResponse.json({ error: "Lesson already published" }, { status: 409 })
    }

    if (lesson._count.cards === 0) {
      return NextResponse.json({ error: "Cannot publish a lesson with no cards" }, { status: 400 })
    }

    const published = await prisma.publishedLesson.create({
      data: {
        lessonId,
        userId: session.user.id,
        title: data.title,
        description: data.description,
        level: data.level,
        tags: data.tags,
        cardCount: lesson._count.cards
      }
    })

    return NextResponse.json({ published }, { status: 201 })
  } catch (error) {
    console.error("Error publishing lesson:", error)
    return NextResponse.json({ error: "Failed to publish" }, { status: 500 })
  }
}

// DELETE /api/lessons/[id]/publish — Unpublish
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: lessonId } = await params

    const published = await prisma.publishedLesson.findUnique({
      where: { lessonId }
    })

    if (!published || published.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await prisma.publishedLesson.delete({
      where: { lessonId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error unpublishing:", error)
    return NextResponse.json({ error: "Failed to unpublish" }, { status: 500 })
  }
}
