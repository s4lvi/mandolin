import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

// GET /api/stories - List user's saved stories
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const stories = await prisma.story.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        titlePinyin: true,
        titleEnglish: true,
        sentences: true,
        createdAt: true
      }
    })

    return NextResponse.json({ stories })
  } catch (error) {
    console.error("Error fetching stories:", error)
    return NextResponse.json(
      { error: "Failed to fetch stories" },
      { status: 500 }
    )
  }
}

// DELETE /api/stories?id=xxx - Delete a story
export async function DELETE(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const storyId = searchParams.get("id")

    if (!storyId) {
      return NextResponse.json({ error: "Story ID required" }, { status: 400 })
    }

    // Verify ownership
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { userId: true }
    })

    if (!story || story.userId !== session.user.id) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 })
    }

    await prisma.story.delete({ where: { id: storyId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting story:", error)
    return NextResponse.json(
      { error: "Failed to delete story" },
      { status: 500 }
    )
  }
}
