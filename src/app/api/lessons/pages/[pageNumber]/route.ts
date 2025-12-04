import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUserDeck } from "@/lib/api-helpers"
import { z } from "zod"

const pageNumberSchema = z.coerce.number().int().positive()

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ pageNumber: string }> }
) {
  try {
    const { error, deck } = await getAuthenticatedUserDeck()
    if (error) return error

    const { pageNumber: pageNumberStr } = await params

    // Validate pageNumber
    const pageNumberResult = pageNumberSchema.safeParse(pageNumberStr)
    if (!pageNumberResult.success) {
      return NextResponse.json(
        { error: "Invalid page number" },
        { status: 400 }
      )
    }
    const pageNumber = pageNumberResult.data

    const { searchParams } = new URL(req.url)
    const lessonId = searchParams.get("lessonId")

    if (!lessonId) {
      return NextResponse.json(
        { error: "lessonId is required" },
        { status: 400 }
      )
    }

    // Verify user has access to this lesson through their deck
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        deckId: deck.id
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
