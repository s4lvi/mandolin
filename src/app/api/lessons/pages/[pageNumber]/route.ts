import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/auth-options"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: { pageNumber: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const pageNumber = parseInt(params.pageNumber)
    const { searchParams } = new URL(req.url)
    const lessonId = searchParams.get("lessonId")

    if (!lessonId) {
      return NextResponse.json(
        { error: "lessonId is required" },
        { status: 400 }
      )
    }

    // Fetch user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Verify user has access to this lesson
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        deck: { userId: user.id }
      }
    })

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    // Fetch the page with segments
    const page = await prisma.lessonPage.findFirst({
      where: {
        lessonId,
        pageNumber
      },
      include: {
        segments: {
          orderBy: { orderIndex: "asc" }
        }
      }
    })

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 })
    }

    return NextResponse.json({
      page: {
        id: page.id,
        pageNumber: page.pageNumber,
        segments: page.segments.map((segment) => ({
          id: segment.id,
          type: segment.type,
          orderIndex: segment.orderIndex,
          content: segment.content
        }))
      }
    })
  } catch (error) {
    console.error("Error fetching page content:", error)
    return NextResponse.json(
      { error: "Failed to fetch page content" },
      { status: 500 }
    )
  }
}
