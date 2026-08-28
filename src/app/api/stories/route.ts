import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { hasPrefetchedStory, prefetchNextStory } from "@/lib/story-prefetch"

// GET /api/stories - List user's saved stories
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const [stories, hasPrefetched] = await Promise.all([
      prisma.story.findMany({
        // Prefetched stories stay hidden until "New Story" claims them
        where: { userId, prefetched: false },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          titlePinyin: true,
          titleEnglish: true,
          sentences: true,
          createdAt: true
        }
      }),
      hasPrefetchedStory(userId)
    ])

    // Make sure the next story is ready by the time the user asks for it
    if (!hasPrefetched) void prefetchNextStory(userId)

    return NextResponse.json({ stories, hasPrefetched })
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
